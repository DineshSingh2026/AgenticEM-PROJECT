/** Token hex values mirrored from app/globals.css, for passing colours to shaders as uniforms. */
export const TOKENS = {
  bg: "#0B0D10", bgElev: "#13161B", bgElev2: "#1B1F26", line: "#262B33", lineStrong: "#3A414C",
  text: "#ECEEF1", textDim: "#9AA3AF", textFaint: "#5D6672",
  copper: "#C9825B", copperSoft: "#E2A985", steel: "#7FA3C6",
  dataBlue: "#2F6FEB", dataRed: "#E5484D", dataGreen: "#30A46C", dataGold: "#F5B544",
  ivory: "#F4F1EA",
} as const;
export type TokenName = keyof typeof TOKENS;
