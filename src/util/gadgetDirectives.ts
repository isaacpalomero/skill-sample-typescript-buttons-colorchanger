import { interfaces, services } from "ask-sdk-model";

const requiredParam = (param: string) => {
    const requiredParamError = new Error(
        `Required parameter, "${param}" is missing.`,
    );
    // preserve original stack trace
    if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(
            requiredParamError,
            requiredParam,
        );
    }
    throw requiredParamError;
};

interface IStartInputHandlerDirective {
    timeout: number;
    proxies?: string[];
    recognizers: {
        [key: string]: services.gameEngine.Recognizer;
    };
    events: {
        [key: string]: services.gameEngine.Event;
    };
}
interface IStopInputHandlerDirective {
    originatingRequestId: string;
}
interface ISetLightDirective {
    targetGadgets?: string[];
    animations: services.gadgetController.LightAnimation[];
    triggerEventTimeMs?: number;
}

export const GadgetDirectives = {
    // returns a StartInputHandler directive that can be added to an Alexa skill response
    // tslint:disable-next-line: object-literal-shorthand
    startInputHandler: (startInputHandlerDirective: IStartInputHandlerDirective): interfaces.gameEngine.StartInputHandlerDirective => {
        if (startInputHandlerDirective.timeout === undefined) {
            requiredParam("timeout");
        } else if (startInputHandlerDirective.recognizers === undefined) {
            requiredParam("recognizers");
        } else if (startInputHandlerDirective.events === undefined) {
            requiredParam("events");
        }
        return { ...startInputHandlerDirective, type: "GameEngine.StartInputHandler" };
    },
    // returns a StopInputHandler directive that can be added to an Alexa skill response
    stopInputHandler: (stopInputHandlerDirective: IStopInputHandlerDirective): interfaces.gameEngine.StopInputHandlerDirective => {
        if (stopInputHandlerDirective.originatingRequestId === undefined) {
            requiredParam("originatingRequestId");
        }
        return { ...stopInputHandlerDirective, type: "GameEngine.StopInputHandler" };
    },

    // returns a SetLight directive, with a 'buttonDown' trigger, that can be added to an Alexa skill response
    setButtonDownAnimation: (setLightDirective: ISetLightDirective): interfaces.gadgetController.SetLightDirective => {
        if (setLightDirective.animations === undefined) {
            requiredParam("animations");
        }

        return {
            type: "GadgetController.SetLight",
            version: 1,
            targetGadgets: setLightDirective.targetGadgets || [],
            parameters: {
                animations: setLightDirective.animations,
                triggerEvent: "buttonDown",
                triggerEventTimeMs: setLightDirective.triggerEventTimeMs || 0,
            },
        };
    },

    // returns a SetLight directive, with a 'buttonUp' trigger, that can be added to an Alexa skill response
    setButtonUpAnimation: (setLightDirective: ISetLightDirective): interfaces.gadgetController.SetLightDirective => {
        if (setLightDirective.animations === undefined) {
            requiredParam("animations");
        }

        return {
            type: "GadgetController.SetLight",
            version: 1,
            targetGadgets: setLightDirective.targetGadgets || [],
            parameters: {
                animations: setLightDirective.animations,
                triggerEvent: "buttonUp",
                triggerEventTimeMs: setLightDirective.triggerEventTimeMs || 0,
            },
        };
    },

    // returns a SetLight directive, with a 'none' trigger, that can be added to an Alexa skill response
    setIdleAnimation: (setLightDirective: ISetLightDirective): interfaces.gadgetController.SetLightDirective => {
        if (setLightDirective.animations === undefined) {
            requiredParam("animations");
        }

        return {
            type: "GadgetController.SetLight",
            version: 1,
            targetGadgets: setLightDirective.targetGadgets || [],
            parameters: {
                animations: setLightDirective.animations,
                triggerEvent: "none",
                triggerEventTimeMs: setLightDirective.triggerEventTimeMs || 0,
            },
        };
    },
};
