/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
import { RequestHandler, HandlerInput, ErrorHandler, RequestInterceptor, ResponseInterceptor, SkillBuilders, Skill } from "ask-sdk-core";
import { Response, interfaces, SessionEndedRequest, RequestEnvelope } from "ask-sdk-model";
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');

// import the skill settings constants
const Settings = require('settings.js');

const RollCall = require('rollcall.js');
const GamePlay = require('gameplay.js');

let skill: Skill;

// ***********************************************************************
//   Global Handlers
//     set up some handlers for events that will have to be handled
//     regardless of what state the skill is in
// ***********************************************************************

class LaunchRequestHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        console.log("LaunchRequestHandler: checking if it can handle " + request.type);
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("LaunchRequestHandler: handling request");

        return RollCall.NewSession(handlerInput);
    }
}

class CustomErrorHandler implements ErrorHandler {
    public canHandle(handlerInput: HandlerInput, error: Error) {
        const { request } = handlerInput.requestEnvelope;
        console.log("Global.ErrorHandler: checking if it can handle "
            + request.type + ": [" + error.name + "] -> " + !!error.name);
        return !!error.name;     // error.name.startsWith('AskSdk');
    }
    public handle(handlerInput: HandlerInput, error: Error) {
        console.log("Global.ErrorHandler: error = " + error.message);

        return handlerInput.responseBuilder
            .speak("An error was encountered while handling your request. Try again later")
            .getResponse();
    }
}

class HelpIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        if (request.type === "IntentRequest" && request.intent.name === "AMAZON.HelpIntent") {
            return true;
        }
        return false;
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("Global.HelpIntentHandler: handling request for help");

        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const ctx = attributesManager.getRequestAttributes();

        if (sessionAttributes.CurrentInputHandlerID) {
            // if there is an active input handler, stop it so it doesn't interrup Alexa speaking the Help prompt
            // see: https://developer.amazon.com/docs/echo-button-skills/receive-echo-button-events.html#stop
            ctx.directives.push(GadgetDirectives.stopInputHandler({
                id: sessionAttributes.CurrentInputHandlerID,
            }));
        }

        if (sessionAttributes.isRollCallComplete === true) {
            // roll call is complete
            ctx.reprompt = ["Pick a color to test your buttons: red, blue, or green. "];
            ctx.reprompt.push(" Or say cancel or exit to quit. ");

            ctx.outputSpeech = ["Now that you have registered two buttons, "];
            ctx.outputSpeech.push("you can pick a color to show when the buttons are pressed. ");
            ctx.outputSpeech.push("Select one of the following colors: red, blue, or green. ");
            ctx.outputSpeech.push("If you do not wish to continue, you can say exit. ");
        } else {
            // the user hasn't yet completed roll call
            ctx.reprompt = ["You can say yes to continue, or no or exit to quit."];
            ctx.outputSpeech = ["You will need two Echo buttons to to use this skill. "];
            ctx.outputSpeech.push("Each of the two buttons you plan to use ");
            ctx.outputSpeech.push("must be pressed for the skill to register them. ");
            ctx.outputSpeech.push("Would you like to continue and register two Echo buttons? ");

            sessionAttributes.expectingEndSkillConfirmation = true;
        }

        return handlerInput.responseBuilder.getResponse();
    }
}

class StopIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        if (request.type === "IntentRequest" && (request.intent.name === "AMAZON.StopIntent" || request.intent.name === "AMAZON.CancelIntent")) {
            return true;
        }
        return false;
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("Global.StopIntentHandler: handling request");
        return handlerInput.responseBuilder
            .speak("Good Bye!")
            .getResponse();
    }
}

class GameEngineInputHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        console.log("Global.GameEngineInputHandler: checking if it can handle " + request.type);
        return request.type === "GameEngine.InputHandlerEvent";
    }
    public handle(handlerInput: HandlerInput): Response {
        const { attributesManager } = handlerInput;
        const request = handlerInput.requestEnvelope.request as interfaces.gameEngine.InputHandlerEventRequest;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const ctx = attributesManager.getRequestAttributes();

        if (request.originatingRequestId !== sessionAttributes.CurrentInputHandlerID) {
            console.log("Global.GameEngineInputHandler: stale input event received -> "
                + "received event from " + request.originatingRequestId
                + " (was expecting " + sessionAttributes.CurrentInputHandlerID + ")");
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }

        const gameEngineEvents = request.events || [];

        for (const event of gameEngineEvents) {
            // In this request type, we'll see one or more incoming events
            // that correspond to the StartInputHandler we sent above.
            switch (event.name) {
                case "first_button_checked_in":
                    ctx.gameInputEvents = event.inputEvents;
                    return RollCall.HandleFirstButtonCheckIn(handlerInput);
                case "second_button_checked_in":
                    ctx.gameInputEvents = event.inputEvents;
                    return RollCall.HandleSecondButtonCheckIn(handlerInput);
                case "button_down_event":
                    if (sessionAttributes.state === Settings.SKILL_STATES.PLAY_MODE) {
                        ctx.gameInputEvents = event.inputEvents;
                        return GamePlay.HandleButtonPressed(handlerInput);
                    }
                    break;
                case "timeout":
                    if (sessionAttributes.state === Settings.SKILL_STATES.PLAY_MODE) {
                        return GamePlay.HandleTimeout(handlerInput);
                    } else {
                        RollCall.HandleTimeout(handlerInput);
                    }
                    break;
            }
        }
        return handlerInput.responseBuilder.getResponse();
    }
}

class YesIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        return request.type === "IntentRequest" && request.intent.name === "AMAZON.YesIntent";
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("Global.YesIntentHandler: handling request");
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const ctx = attributesManager.getRequestAttributes();
        const state = sessionAttributes.state || "";
        // ---- Hanlde "Yes" when we're in the context of Roll Call ...
        if (state === Settings.SKILL_STATES.ROLL_CALL_MODE
            && sessionAttributes.expectingEndSkillConfirmation === true) {
            // pass control to the StartRollCall event handler to restart the rollcall process
            ctx.outputSpeech = ["Ok. Press the first button, wait for confirmation,"];
            ctx.outputSpeech.push("then press the second button.");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);
            ctx.timeout = 30000;
            return RollCall.StartRollCall(handlerInput);
        } else if (state === Settings.SKILL_STATES.EXIT_MODE
            && sessionAttributes.expectingEndSkillConfirmation === true) {
            return new SessionEndedRequestHandler().handle(handlerInput);
        } else if (state === Settings.SKILL_STATES.EXIT_MODE) {
            // ---- Hanlde "Yes", if we're in EXIT_MODE, but not expecting exit confirmation
            return new DefaultHandler().handle(handlerInput);
        } else {
            // ---- Hanlde "Yes" in other cases .. just fall back on the help intent
            return new HelpIntentHandler().handle(handlerInput);
        }
    }
}
class NoIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        const { request } = handlerInput.requestEnvelope;
        return request.type === "IntentRequest" && request.intent.name === "AMAZON.NoIntent";
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("Global.NoIntentHandler: handling request");
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const ctx = attributesManager.getRequestAttributes();
        const state = sessionAttributes.state || "";

        // ---- Hanlde "No" when we're in the context of Roll Call ...
        if (state === Settings.SKILL_STATES.ROLL_CALL_MODE
            && sessionAttributes.expectingEndSkillConfirmation === true) {
            // if user says No when prompted whether they will to continue with rollcall then just exit
            return new StopIntentHandler().handle(handlerInput);
        }
        if (state === Settings.SKILL_STATES.EXIT_MODE
            && sessionAttributes.expectingEndSkillConfirmation === true) {
            ctx.reprompt = ["Pick a different color, red, blue, or green."];
            ctx.outputSpeech = ["Ok, let's keep going."];
            ctx.outputSpeech.push(ctx.reprompt);
            ctx.openMicrophone = true;
            sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;
            return handlerInput.responseBuilder.getResponse();
        } else if (state === Settings.SKILL_STATES.EXIT_MODE) {
            // ---- Hanlde "No" in other cases .. just fall back on the help intent
            return new DefaultHandler().handle(handlerInput);
        } else {
            // ---- Hanlde "No" in other cases .. just fall back on the help intent
            return new HelpIntentHandler().handle(handlerInput);
        }
    }
}

class DefaultHandler implements RequestHandler {
    public canHandle(_handlerInput: HandlerInput): boolean {
        console.log("Global.DefaultHandler: always can handle");
        return true;
    }
    public handle(handlerInput: HandlerInput): Response {
        console.log("Global.DefaultHandler: handling request");
        if (handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "colorIntent") {
            return GamePlay.ColorIntentHandler(handlerInput);
        }

        const ctx = handlerInput.attributesManager.getRequestAttributes();

        // otherwise, try to let the user know that we couldn't understand the request
        //  and prompt for what to do next
        ctx.reprompt = ["Please say again, or say help if you're not sure what to do."];
        ctx.outputSpeech = ["Sorry, I didn't get that. " + ctx.reprompt[0]];

        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    }
}
class SessionEndedRequestHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
    }
    public handle(handlerInput: HandlerInput): Response {
        const request = handlerInput.requestEnvelope.request as SessionEndedRequest;
        console.log(`Session ended with reason: ${request.reason}`);
        const response = handlerInput.responseBuilder.getResponse();
        response.shouldEndSession = true;
        const ctx = handlerInput.attributesManager.getRequestAttributes();
        ctx.outputSpeech = ["Good bye!"];
        return handlerInput.responseBuilder.getResponse();
    }
}

class CustomRequestInterceptor implements RequestInterceptor {
    public process(handlerInput: HandlerInput) {
        console.log("Global.RequestInterceptor: pre-processing response");
        const { attributesManager } = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        ctx.directives = [];
        ctx.outputSpeech = [];
        ctx.reprompt = [];
        console.log("Global.RequestInterceptor: pre-processing response complete");
    }
}

class CustomResponseInterceptor implements ResponseInterceptor {
    public process(handlerInput: HandlerInput, response?: Response): Promise<void> | void {
        const { attributesManager, responseBuilder } = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        console.log("Global.ResponseInterceptor: post-processing response " + JSON.stringify(ctx));

        if (ctx.outputSpeech.length > 0) {
            const outputSpeech = ctx.outputSpeech.join(" ");
            console.log("Global.ResponseInterceptor: adding "
                + ctx.outputSpeech.length + " speech parts");
            responseBuilder.speak(outputSpeech);
        }
        if (ctx.reprompt.length > 0) {
            console.log("Global.ResponseInterceptor: adding "
                + ctx.outputSpeech.length + " speech reprompt parts");
            const reprompt = ctx.reprompt.join(" ");
            responseBuilder.reprompt(reprompt);
        }

        if ("openMicrophone" in ctx && response) {
            if (ctx.openMicrophone) {
                // setting shouldEndSession = fase  -  lets Alexa know that we want an answer from the user
                // see: https://developer.amazon.com/docs/echo-button-skills/receive-voice-input.html#open
                //      https://developer.amazon.com/docs/echo-button-skills/keep-session-open.html
                response.shouldEndSession = false;
                console.log("Global.ResponseInterceptor: request to open microphone -> shouldEndSession = false");
            } else {
                // deleting shouldEndSession will keep the skill session going,
                //  while the input handler is active, waiting for button presses
                // see: https://developer.amazon.com/docs/echo-button-skills/keep-session-open.html
                delete response.shouldEndSession;
                console.log("Global.ResponseInterceptor: request to open microphone -> delete shouldEndSession");
            }
        }

        if (Array.isArray(ctx.directives) && response) {
            console.log("Global.ResponseInterceptor: processing " + ctx.directives.length + " custom directives ");
            response.directives = response.directives || [];

            for (const directive of ctx.directives) {
                response.directives.push(directive);
            }
        }

        console.log(`==Response==${JSON.stringify(response)}`);
        console.log(`==SessionAttributes==${JSON.stringify(attributesManager.getSessionAttributes())}`);
    }
}

/* LAMBDA SETUP */
const skillBuilder = SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        new LaunchRequestHandler(),
        new GameEngineInputHandler(),
        new HelpIntentHandler(),
        new StopIntentHandler(),
        new YesIntentHandler(),
        new NoIntentHandler(),
        new SessionEndedRequestHandler(),
        new DefaultHandler(),
    )
    .addRequestInterceptors(new CustomRequestInterceptor())
    .addResponseInterceptors(new CustomResponseInterceptor())
    .addErrorHandlers(new CustomErrorHandler())
    .lambda();

exports.handler = (event: RequestEnvelope, context?: any) => {
    // Prints Alexa Event Request to CloudWatch logs for easier debugging
    console.log(`===EVENT===${JSON.stringify(event)}`);
    if (!skill) {
        skill = SkillBuilders.custom()
            .addRequestHandlers(
                new LaunchRequestHandler(),
                new GameEngineInputHandler(),
                new HelpIntentHandler(),
                new StopIntentHandler(),
                new YesIntentHandler(),
                new NoIntentHandler(),
                new SessionEndedRequestHandler(),
                new DefaultHandler(),
            )
            .addRequestInterceptors(new CustomRequestInterceptor())
            .addResponseInterceptors(new CustomResponseInterceptor())
            .addErrorHandlers(new CustomErrorHandler())
            .create();
    }

    // TODO: show example of setting up DynamoDB persistance using new Alexa SDK v2
    return skill.invoke(event, context);
};
