// Jersey studio fonts. Each exposes --jf-<id>, matching JERSEY_FONTS in @/lib/jersey-kit.
// preload: false keeps the files off other pages until a design actually uses them.
import {
  Alfa_Slab_One,
  Anton,
  Archivo_Black,
  Bangers,
  Barlow_Condensed,
  Be_Vietnam_Pro,
  Bebas_Neue,
  Black_Ops_One,
  Bungee,
  Bungee_Inline,
  Chakra_Petch,
  Chonburi,
  Dancing_Script,
  Exo_2,
  Fjalla_One,
  Graduate,
  Kanit,
  Lobster,
  Montserrat,
  Orbitron,
  Oswald,
  Oxanium,
  Pacifico,
  Paytone_One,
  Play,
  Racing_Sans_One,
  Roboto_Condensed,
  Russo_One,
  Saira_Condensed,
  Sedgwick_Ave_Display,
  Sigmar_One,
  Squada_One,
  Staatliches,
  Teko,
} from "next/font/google"

const anton = Anton({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-anton", preload: false, display: "swap" })
const oswald = Oswald({ subsets: ["latin", "vietnamese"], variable: "--jf-oswald", preload: false, display: "swap" })
const saira = Saira_Condensed({ weight: "800", subsets: ["latin", "vietnamese"], variable: "--jf-saira", preload: false, display: "swap" })
const barlow = Barlow_Condensed({ weight: "800", subsets: ["latin", "vietnamese"], variable: "--jf-barlow", preload: false, display: "swap" })
const fjalla = Fjalla_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-fjalla", preload: false, display: "swap" })
const roboto = Roboto_Condensed({ subsets: ["latin", "vietnamese"], variable: "--jf-roboto", preload: false, display: "swap" })
const montserrat = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--jf-montserrat", preload: false, display: "swap" })
const kanit = Kanit({ weight: "800", subsets: ["latin", "vietnamese"], variable: "--jf-kanit", preload: false, display: "swap" })
const exo = Exo_2({ subsets: ["latin", "vietnamese"], variable: "--jf-exo", preload: false, display: "swap" })
const chakra = Chakra_Petch({ weight: "700", subsets: ["latin", "vietnamese"], variable: "--jf-chakra", preload: false, display: "swap" })
const play = Play({ weight: "700", subsets: ["latin", "vietnamese"], variable: "--jf-play", preload: false, display: "swap" })
const bevietnam = Be_Vietnam_Pro({ weight: "800", subsets: ["latin", "vietnamese"], variable: "--jf-bevietnam", preload: false, display: "swap" })
const bungee = Bungee({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-bungee", preload: false, display: "swap" })
const bungeeinline = Bungee_Inline({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-bungeeinline", preload: false, display: "swap" })
const blackops = Black_Ops_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-blackops", preload: false, display: "swap" })
const alfa = Alfa_Slab_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-alfa", preload: false, display: "swap" })
const paytone = Paytone_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-paytone", preload: false, display: "swap" })
const sigmar = Sigmar_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-sigmar", preload: false, display: "swap" })
const chonburi = Chonburi({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-chonburi", preload: false, display: "swap" })
const bangers = Bangers({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-bangers", preload: false, display: "swap" })
const sedgwick = Sedgwick_Ave_Display({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-sedgwick", preload: false, display: "swap" })
const lobster = Lobster({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-lobster", preload: false, display: "swap" })
const pacifico = Pacifico({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--jf-pacifico", preload: false, display: "swap" })
const dancing = Dancing_Script({ subsets: ["latin", "vietnamese"], variable: "--jf-dancing", preload: false, display: "swap" })
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--jf-bebas", preload: false, display: "swap" })
const teko = Teko({ subsets: ["latin"], variable: "--jf-teko", preload: false, display: "swap" })
const graduate = Graduate({ weight: "400", subsets: ["latin"], variable: "--jf-graduate", preload: false, display: "swap" })
const russo = Russo_One({ weight: "400", subsets: ["latin"], variable: "--jf-russo", preload: false, display: "swap" })
const orbitron = Orbitron({ subsets: ["latin"], variable: "--jf-orbitron", preload: false, display: "swap" })
const staatliches = Staatliches({ weight: "400", subsets: ["latin"], variable: "--jf-staatliches", preload: false, display: "swap" })
const squada = Squada_One({ weight: "400", subsets: ["latin"], variable: "--jf-squada", preload: false, display: "swap" })
const racing = Racing_Sans_One({ weight: "400", subsets: ["latin"], variable: "--jf-racing", preload: false, display: "swap" })
const oxanium = Oxanium({ subsets: ["latin"], variable: "--jf-oxanium", preload: false, display: "swap" })
const archivo = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--jf-archivo", preload: false, display: "swap" })

/** Put on an ancestor of any jersey render so text can resolve its font variable. */
export const jerseyFontVariables = [
  anton, oswald, saira, barlow, fjalla, roboto, montserrat, kanit, exo, chakra, play, bevietnam,
  bungee, bungeeinline, blackops, alfa, paytone, sigmar, chonburi, bangers, sedgwick, lobster,
  pacifico, dancing, bebas, teko, graduate, russo, orbitron, staatliches, squada, racing, oxanium, archivo,
].map((font) => font.variable).join(" ")
