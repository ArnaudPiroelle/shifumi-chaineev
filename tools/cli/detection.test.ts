import { describe, expect, it } from "vitest";
import { detect, normalize, parseVtt, type TimedWord } from "./detection.ts";

/** des mots espacés d'une seconde à partir de `t` */
const at = (t: number, text: string): TimedWord[] => text.split(" ").map((w, i) => [t + i, w]);

describe("normalize", () => {
  it("met en minuscules et retire les accents", () => {
    expect(normalize("Écoute ÇA, Noël")).toBe("ecoute ca, noel");
  });
});

describe("parseVtt", () => {
  it("lit les sous-titres auto mot à mot, sans les lignes répétées", () => {
    const vtt = [
      "WEBVTT",
      "Kind: captions",
      "Language: fr",
      "",
      "00:00:01.000 --> 00:00:03.000 align:start position:0%",
      "",
      "on<00:00:01.500><c> fait</c><00:00:02.000><c> chifoumi</c>",
      "",
      "00:00:03.000 --> 00:00:03.010 align:start position:0%",
      "on fait chifoumi",
      "",
    ].join("\n");
    expect(parseVtt(vtt)).toEqual([
      [1, "on"],
      [1.5, "fait"],
      [2, "chifoumi"],
    ]);
  });

  it("lit les sous-titres manuels ligne par ligne, sans les doublons consécutifs", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:01:00.000 --> 00:01:02.000",
      "<i>Pierre</i> feuille",
      "",
      "00:01:02.000 --> 00:01:04.000",
      "Pierre feuille",
    ].join("\n");
    expect(parseVtt(vtt)).toEqual([
      [60, "Pierre"],
      [60, "feuille"],
    ]);
  });
});

describe("detect", () => {
  it("repère un chifoumi et cadre l'extrait autour", () => {
    const words = [...at(0, "bon on y va"), ...at(100, "allez chi-fou-mi je fais ciseaux"), ...at(300, "fin")];
    const [d, ...rest] = detect(words);
    expect(rest).toEqual([]);
    expect(d).toMatchObject({ start: 93, end: 124, keywords: ["chi-fou-mi", "ciseaux", "fais ciseaux"] });
    expect(d!.snippet).toBe("allez chi-fou-mi je fais ciseaux");
  });

  it("ignore un « Pierre » isolé, mais garde deux coups différents", () => {
    expect(detect(at(10, "Pierre arrive demain"))).toEqual([]);
    expect(detect(at(10, "alors pierre et puis feuille"))).toHaveLength(1);
  });

  it("sépare les passages éloignés de plus de 45 s", () => {
    expect(detect([...at(0, "chifoumi"), ...at(100, "shifumi")])).toHaveLength(2);
    expect(detect([...at(0, "chifoumi"), ...at(40, "shifumi")])).toHaveLength(1);
  });

  it("ne confond pas un mot qui contient un coup", () => {
    expect(detect(at(0, "les pierreries et les feuillets"))).toEqual([]);
  });
});
