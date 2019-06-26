// Basic Animation Helper Library

import { services } from "ask-sdk-model";
import { getColor } from "./colorsList";

export const BasicAnimations = {
  // Solid Animation
  SolidAnimation(cycles: number, color: string, duration: number): services.gadgetController.LightAnimation[] {
    // console.log('SolidAnimation');
    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: duration,
            blend: false,
            color: validateColor(color),
          },
        ],
      },
    ];
  },
  // FadeIn Animation
  FadeAnimation(color: string, duration: number): services.gadgetController.LightAnimation[] {
    return [
      {
        repeat: 1,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: duration,
            blend: true,
            color: validateColor(color),
          },
        ],
      },
    ];
  },
  // FadeIn Animation
  FadeInAnimation(cycles: number, color: string, duration: number): services.gadgetController.LightAnimation[] {
    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: 1,
            blend: true,
            color: "000000",
          }, {
            durationMs: duration,
            blend: true,
            color: validateColor(color),
          },
        ],
      },
    ];
  },
  // FadeOut Animation
  FadeOutAnimation(cycles: number, color: string, duration: number): services.gadgetController.LightAnimation[] {

    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: duration,
            blend: true,
            color: validateColor(color),
          }, {
            durationMs: 1,
            blend: true,
            color: "000000",
          },
        ],
      },
    ];
  },
  // CrossFade Animation
  CrossFadeAnimation(cycles: number, colorOne: string, colorTwo: string, durationOne: number, durationTwo: number): services.gadgetController.LightAnimation[] {
    // console.log('CrossFadeAnimation');

    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: durationOne,
            blend: true,
            color: validateColor(colorOne),
          }, {
            durationMs: durationTwo,
            blend: true,
            color: validateColor(colorTwo),
          },
        ],
      },
    ];
  },
  // Breathe Animation
  BreatheAnimation(cycles: number, color: string, duration: number): services.gadgetController.LightAnimation[] {
    // console.log('BreatheAnimation');

    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: 1,
            blend: true,
            color: "000000",
          },
          {
            durationMs: duration,
            blend: true,
            color: validateColor(color),
          },
          {
            durationMs: 300,
            blend: true,
            color: validateColor(color),
          },
          {
            durationMs: 300,
            blend: true,
            color: "000000",
          },
        ],
      },
    ];
  },
  // Blink Animation
  BlinkAnimation(cycles: number, color: string): services.gadgetController.LightAnimation[] {
    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: 500,
            blend: false,
            color: validateColor(color),
          }, {
            durationMs: 500,
            blend: false,
            color: "000000",
          },
        ],
      },
    ];
  },
  // Flip Animation
  FlipAnimation(cycles: number, colorOne: string, colorTwo: string, durationOne: number, durationTwo: number): services.gadgetController.LightAnimation[] {
    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: durationOne,
            blend: false,
            color: validateColor(colorOne),
          }, {
            durationMs: durationTwo,
            blend: false,
            color: validateColor(colorTwo),
          },
        ],
      },
    ];
  },
  // Pulse Animation
  PulseAnimation(cycles: number, colorOne: string, colorTwo: string): services.gadgetController.LightAnimation[] {
    return [
      {
        repeat: cycles,
        targetLights: ["1"],
        sequence: [
          {
            durationMs: 500,
            blend: true,
            color: validateColor(colorOne),
          }, {
            durationMs: 1000,
            blend: true,
            color: validateColor(colorTwo),
          },
        ],
      },
    ];
  },
};

// Function to validate the color argument passed. If it's a color name,
// it compares it to the list of colors defined in the colorList.js,
// and returns back the Hex code if applicable.
function validateColor(requestedColor: string) {
  const color = requestedColor || "";
  if (color.indexOf("0x") === 0) {
    return color.substring(2);
  } else if (color.indexOf("#") === 0) {
    return color.substring(1);
  } else {
    return getColor(color) || color;
  }
}
