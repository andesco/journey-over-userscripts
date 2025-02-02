// ==UserScript==
// @name          DMM - Add Trash Guide Regex Buttons
// @version       1.0.0
// @description   Adds buttons to Debrid Media Manager for applying Trash Guide regex patterns.
// @author        Journey Over
// @license       MIT
// @match         *://debridmediamanager.com/*
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=debridmediamanager.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    NOTIFICATION_DURATION: 3000,
    FADE_DURATION: 500,
    CONTAINER_SELECTOR: '.mb-2',
    CHECK_INTERVAL: 50,
    MAX_RETRIES: 20,
    BUTTON_STYLES: {
      base: 'cursor-pointer whitespace-nowrap rounded px-2 py-0.5 text-xs text-white shadow-md transition-all',
      colors: {
        default: '#ff6b6b',
        hover: '#ff3333',
      },
      dropdownButton: {
        background: '#ff6b6b',
        border: '1px solid #ff4c4c',
        hoverBackground: '#ff3333',
      },
    },
    DROPDOWN_STYLES: {
      base: 'absolute bg-gray-800 text-white rounded-lg shadow-lg w-48 mt-2 opacity-0 transition-opacity duration-500 ease-in-out',
      item: 'px-4 py-2 cursor-pointer text-sm hover:bg-gray-600 transition-colors duration-200',
      zIndex: '9999',
      display: 'none',
    },
  };

  const BUTTON_DATA = [
    {
      name: 'All',
      buttonData: [
        { name: 'Highest tier releases', value: "(\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b|\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ)\\b|-BMF|-WiLDCAT)" },
        { name: 'All Trash recommended', value: "((\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b|\\b(0x539)\\b|\\[Alt\\]|-Alt\\b|\\[ARC\\]|-ARC\\b|\\[Arid\\]|-Arid\\b|\\b(aro)\\b|\\b(Baws)\\b|\\b(BKC)\\b|\\b(Brrrrrrr)\\b|\\b(Chotab)\\b|\\[Crow\\]|-Crow\\b|\\b(CUNNY)\\b|\\b(CsS)\\b|\\b(D-Z0N3)\\b|\\b(Dae)\\b|\\b(Datte13)\\b|\\[Drag\\]|-Drag\\b|\\b(FLFL)\\b|\\b(hydes)\\b|\\b(iKaos)\\b|\\b(JySzE)\\b|\\b(LostYears)\\b|\\[Lulu\\]|-Lulu\\b|\\b(Matsya)\\b|\\b(MC)\\b|\\[Metal\\]|-Metal\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Noyr)\\b|\\b(NSDAB)\\b|\\b(Okay-Subs)\\b|\\b(pog42)\\b|\\b(pyroneko)\\b|\\b(RAI)\\b|\\b(Reza)\\b|\\b(Shimatta)\\b|\\[Smoke\\]|-Smoke\\b|\\b(Spirale)\\b|\\[Thighs\\]|-Thighs\\b|\\b(UDF)\\b|\\[Yuki\\]|-Yuki\\b|\\[AC\\]|-AC|\\b(ASC)\\b|\\b(AssMix)\\b|\\[Ayashii\\]|-Ayashii\\b|\\b(CBT)\\b|\\b(CTR)\\b|\\b(CyC)\\b|\\[Dekinai\\]|-Dekinai\\b|\\[EXP\\]|-EXP\\b|\\b(Galator)\\b|\\b(GSK[._-]kun)\\b|\\b(Holomux)\\b|\\b(IK)\\b|\\b(AnimeKaizoku)\\b|\\[Kaizoku\\]|-Kaizoku\\b|\\b(Kametsu)\\b|\\b(KH)\\b|\\b(kuchikirukia)\\b|\\b(LazyRemux)\\b|\\b(MK)\\b|\\[Mysteria\\]|-Mysteria\\b|\\b(Netaro)\\b|\\b(Pn8)\\b|\\b(Pookie)\\b|\\b(Quetzal)\\b|\\b(Rasetsu)\\b|\\[Senjou\\]|-Senjou\\b|\\b(ShowY)\\b|\\b(WBDP)\\b|\\b(WSE)\\b|\\b(Yoghurt)\\b|\\[YURI\\]|-YURI\\b|\\b(ZOIO)\\b|\\b(deanzel)\\b|\\b(ShadyCrab)\\b|\\b(hchcsen)\\b|\\b(NH)\\b|\\[Chimera\\]|-Chimera\\b|\\[Bulldog\\]|-Bulldog\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\b(Koten)\\b|\\b(Kulot)\\b|\\[Asakura\\]|-Asakura\\b|\\b(HaiveMind)\\b|\\b(mottoj)\\b|\\[Bolshevik\\]|-Bolshevik\\b|\\b(Scriptum)\\b|\\[SOLA\\]|-SOLA\\b|\\b(NTRM)\\b|\\b(ASO)\\b|\\b(MCLR)\\b|\\b(D3)\\b|\\b(AOmundson)\\b|\\b(RMX)\\b|\\b(karios)\\b|\\b(xPearse)\\b|\\b(kBaraka)\\b|\\b(SNSbu)\\b|\\[Orphan\\]|-Orphan\\b|\\b(Cait-Sidhe)\\b|\\b(THORA)\\b|\\[Davinci\\]|-Davinci\\b|\\b(GHS)\\b|\\b(Iznjie)\\b|\\b(9volt)\\b|\\[Lia\\]|-Lia\\b|\\b(kmplx)\\b|\\b(UWU)\\b|\\b(Koitern)\\b|\\b(Commie)\\b|\\b(Kaleido)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(SallySubs)\\b|\\b(CoalGirls)\\b|\\b(ANThELIa)\\b|\\b(AP)\\b|\\b(BluDragon)\\b|\\b(D4C)\\b|\\b(Dragon-Releases)\\b|\\b(E[.-]N[.-]D)\\b|\\b(KAWAiREMUX)\\b|\\b(MKVULTRA)\\b|\\b(Raizel)\\b|\\b(REVO)\\b|\\[Spark\\]|-Spark\\b|\\b(SRLS)\\b|\\b(TTGA)\\b|\\b(ZR)\\b|\\[Afro\\]|-Afro\\b|\\[Akai\\]|-Akai\\b|\\[Almighty\\]|-Almighty\\b|\\[ANE\\]|-ANE|\\b(Asenshi)\\b|\\b(BlurayDesuYo)\\b|\\b(Bunny-Apocalypse)\\b|\\[CH\\]|-CH\\b|\\b(EJF)\\b|\\b(Exiled-Destiny|E-D)\\b|\\b(FFF)\\b|\\b(Final8)\\b|\\b(GS)\\b|\\[Harunatsu\\]|-Harunatsu\\b|\\[Impatience\\]|-Impatience\\b|\\b(Inka-Subs)\\b|\\[Judgment\\]|-Judgment\\b|\\[Kantai\\]|-Kantai\\b|\\b(LCE)\\b|\\b(Licca)\\b|\\[Nii-sama\\]|-Nii-sama\\b|\\b(niizk)\\b|\\b(Nishi-Taku)\\b|\\b(OnDeed)\\b|\\b(orz)\\b|\\b(PAS)\\b|\\b(peachflavored)\\b|\\b(Saizen)\\b|\\b(SCP-2223)\\b|\\b(SHiN-gx)\\b|\\b(SmugCat)\\b|\\[Soldado\\]|-Soldado\\b|\\[Sushi\\]|-Sushi\\b|\\[Vivid\\]|-Vivid\\b|\\[Watashi\\]|-Watashi\\b|\\[Yabai\\]|-Yabai\\b|\\b(Zurako)\\b|\\b(A-L)\\b|\\b(ANiHLS)\\b|\\b(CBM)\\b|\\b(DHD)\\b|\\b(DragsterPS)\\b|\\b(HAiKU)\\b|\\b(Hark0N)\\b|\\b(iAHD)\\b|\\b(inid4c)\\b|\\b(KS|KiyoshiStar)\\b|\\b(MCR)\\b|\\[NPC\\]|-NPC\\b|\\b(RedBlade)\\b|\\b(RH)\\b|\\b(SEV)\\b|\\[STRiFE\\]|-STRiFE\\b|\\b(TENEIGHTY)\\b|\\b(WaLMaRT)\\b|\\b(AkihitoSubs)\\b|\\b(Arukoru)\\b|\\[EDGE\\]|-EDGE\\b|\\[EMBER\\]|-EMBER\\b|\\[GHOST\\]|-GHOST\\b|\\[Judas\\]|-Judas|\\[naiyas\\]|-naiyas\\b|\\b(Nep[._-]Blanc)\\b|\\[Prof\\]|-Prof\\b|\\b(ShirÏƒ)\\b|\\[YURASUKA\\]|-YURASUKA\\b|\\b(Setsugen)\\b|\\b(Z4ST1N)\\b|\\[Cyan\\]|-Cyan\\b|\\[Dae\\]|-Dae\\b|\\[Gao\\]|-Gao\\b|\\b(HatSubs)\\b|\\[Pizza\\]|-Pizza\\b|\\b(Slyfox)\\b|\\b(SoLCE)\\b|\\[tenshi\\]|-tenshi|\\b(SubsPlease)\\b|\\b(SubsPlus\\+?)\\b|\\b(BlueLobster)\\b|\\b(Erai-raws)\\b|\\b(GST)\\b|\\b(HorribleRips)\\b|\\b(HorribleSubs)\\b|\\b(KAN3D2M)\\b|\\b(NanDesuKa)\\b|\\b(URANIME)\\b|\\b(VARYG)\\b|\\[ZigZag\\]|-ZigZa|\\b(GJM)\\b|\\b(SobsPlease)\\b|\\b(DameDesuYo)\\b)|\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ|Flights|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES|decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN|CtrlHD|MainFrame|DON|W4NK3R|HQMUX|BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV|BBQ|c0kE|Chotab|CRiSC|D-Z0N3|Dariush|EbP|EDPH|Geek|LolHD|TayTO|TDD|TnP|VietHD|EA|HiDt|HiSD|QOQ|SA89|sbR|LoRD|playHD|ABBIE|AJP69|APEX|PAXA|PEXA|XEPA|BLUTONiUM|CMRG|CRFW|CRUD|FLUX|GNOME|KiNGS|Kitsune|NOSiViD|NTG|SiC|dB|MiU|monkee|MZABI|PHOENiX|playWEB|SbR|SMURF|TOMMY|XEBEC|4KBEC|CEBEX|ABBiE|CasStudio|RTN|T6D|ViSUM|3cTWeB|BTW|Cinefeel|CiT|Coo7|DEEP|END|ETHiCS|FC|iJP|iKA|iT00NZ|JETIX|KHN|KiMCHI|LAZY|NPMS|NYH|orbitron|PSiG|ROCCaT|RTFM|SDCC|SIGMA|SPiRiT|TVSmash|WELP|DRACULA|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H|ViSiON|DEFLATE|INFLATE)\\b|-BMF|-WiLDCAT)" },
        { name: 'Bad releases', value: "\\b(0neshot|1XBET|24xHD|41RGB|4K4U|A-Destiny|AIUS|AREY|AROMA|ASW|AV1|AZAZE|AceAres|AhmadDev|AniVoid|AnimeDynastyEN|AnimeKuro|AnimeRG|AnimeTR|Animesubs|Anitsu|ArataEnc|Ari|Asuka|BARC0DE|BDMV|BDVD|BJX|(Baked|Dead|Space)Fish|BdC|Beatrice|BiTOR|BlackLuster|C4K|CBB|CDDHD|CHD|CREATiVE24|CTFOH|CameEsp|Cat66|Cerberus|CiNE|Cleo|CrEwSaDe|CuaP|DARKFLiX|DBArabic|DDR|DKB|DNL|DP|Daddy|Deadmau|DepraveD|DsunS|Emmid|EuReKA|ExREN|FAV|FGT|FRDS|FZHD|FaNGDiNG0|Fumi|FunArts|GERMini|GHD|GPTHD|GalaxyRG|Golumpa|HAV1T|HDS|HDT|HDTime|HDWinG|HENiL|Hakata|Hall_of_C|Hatsuyuki|Hitoki|HollowRoxas|ICEBLUE|Iriza|JFF|JacobSwaggedUp|Johnny-englishsubs|KC|KEKMASTERS|KIRA|KQRM|KRP|KaiDubs|Kallango|KamiFS|Kanjouteki|Kawaiika|Kirion|Koi|L0SERNIGHT|LAMA|Leffe|LiGaS|Liber8|Lilith|LoliHouse|LowPower|M2TS|M@nI|MD|MGD|MT|MTeam|MarkII|Maximus|MeGusta|Metaljerk|MiniFreeza|MiniMTBB|MiniTheatre|MinisCuba|Mites|Modders|Moozzi2|Mr\\.Deadpool|MySiLU|NC|NS|Nanako|NemDiggers|N(eo|wo)b|NhaNc3|NoGrp|Nokou|Nyanpasu|OFT|Ohys|OldCastle|PATOMiEL|PRODJi|PSA|PTNK|Pahe|Pandoratv|Pantsu|Pao|Pixel|Plex|PnPSubs|Polarwindz|Project-gxs|PuyaSubs|QAS|QCE|RDN|RU4HD|Rando235|Ranger|Rapta|Raws-Maji|Raze|Reaktor|ReinForce|Rifftrax|RightShiftBy2|SAD|SANTi|SEiN|SHD|SHFS|SLAX|SRW|SSA|STUTTERSHIT|SWTYBLZ|Salieri|Samir755|SanKyuu|SasukeducK|Scryous|Seicher|ShieldBearer|Shiniori|Sokudo|StrayGods|Suki|TBS|TEKNO3D|TIKO|TOPKEK|TeamTurquoize|TeeWee|Tenrai|Tigole|TnF|Trix|U3-Web|UNBIASED|USD|Upscaler|VECTOR|VISIONPLUSHDR|Valenciano|VipapkStudios|WAF|Wardevil|WiKi|Will1869|YIFY|YTS|Yabai_Desu_NeRandomRemux|YakuboEncodes|Yameii|YuiSubs|Zeus|\\$tore-Chill|aXXo|bonkai77|d3g|iNTENSO|iPUNISHER|iPlanet|iVy|jennaortega|km|mHD|mSD|mdcx|nHD|nSD|neko|neoHEVC|nikt0|phazer11|sekkusu&ok|tarunk9c|torenter69|x0r|xiao-av1|youshikibi)\\b" },
        { name: 'Not trash recommended', value: "^((?!(\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b|\\b(0x539)\\b|\\[Alt\\]|-Alt\\b|\\[ARC\\]|-ARC\\b|\\[Arid\\]|-Arid\\b|\\b(aro)\\b|\\b(Baws)\\b|\\b(BKC)\\b|\\b(Brrrrrrr)\\b|\\b(Chotab)\\b|\\[Crow\\]|-Crow\\b|\\b(CUNNY)\\b|\\b(CsS)\\b|\\b(D-Z0N3)\\b|\\b(Dae)\\b|\\b(Datte13)\\b|\\[Drag\\]|-Drag\\b|\\b(FLFL)\\b|\\b(hydes)\\b|\\b(iKaos)\\b|\\b(JySzE)\\b|\\b(LostYears)\\b|\\[Lulu\\]|-Lulu\\b|\\b(Matsya)\\b|\\b(MC)\\b|\\[Metal\\]|-Metal\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Noyr)\\b|\\b(NSDAB)\\b|\\b(Okay-Subs)\\b|\\b(pog42)\\b|\\b(pyroneko)\\b|\\b(RAI)\\b|\\b(Reza)\\b|\\b(Shimatta)\\b|\\[Smoke\\]|-Smoke\\b|\\b(Spirale)\\b|\\[Thighs\\]|-Thighs\\b|\\b(UDF)\\b|\\[Yuki\\]|-Yuki\\b|\\[AC\\]|-AC|\\b(ASC)\\b|\\b(AssMix)\\b|\\[Ayashii\\]|-Ayashii\\b|\\b(CBT)\\b|\\b(CTR)\\b|\\b(CyC)\\b|\\[Dekinai\\]|-Dekinai\\b|\\[EXP\\]|-EXP\\b|\\b(Galator)\\b|\\b(GSK[._-]kun)\\b|\\b(Holomux)\\b|\\b(IK)\\b|\\b(AnimeKaizoku)\\b|\\[Kaizoku\\]|-Kaizoku\\b|\\b(Kametsu)\\b|\\b(KH)\\b|\\b(kuchikirukia)\\b|\\b(LazyRemux)\\b|\\b(MK)\\b|\\[Mysteria\\]|-Mysteria\\b|\\b(Netaro)\\b|\\b(Pn8)\\b|\\b(Pookie)\\b|\\b(Quetzal)\\b|\\b(Rasetsu)\\b|\\[Senjou\\]|-Senjou\\b|\\b(ShowY)\\b|\\b(WBDP)\\b|\\b(WSE)\\b|\\b(Yoghurt)\\b|\\[YURI\\]|-YURI\\b|\\b(ZOIO)\\b|\\b(deanzel)\\b|\\b(ShadyCrab)\\b|\\b(hchcsen)\\b|\\b(NH)\\b|\\[Chimera\\]|-Chimera\\b|\\[Bulldog\\]|-Bulldog\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\b(Koten)\\b|\\b(Kulot)\\b|\\[Asakura\\]|-Asakura\\b|\\b(HaiveMind)\\b|\\b(mottoj)\\b|\\[Bolshevik\\]|-Bolshevik\\b|\\b(Scriptum)\\b|\\[SOLA\\]|-SOLA\\b|\\b(NTRM)\\b|\\b(ASO)\\b|\\b(MCLR)\\b|\\b(D3)\\b|\\b(AOmundson)\\b|\\b(RMX)\\b|\\b(karios)\\b|\\b(xPearse)\\b|\\b(kBaraka)\\b|\\b(SNSbu)\\b|\\[Orphan\\]|-Orphan\\b|\\b(Cait-Sidhe)\\b|\\b(THORA)\\b|\\[Davinci\\]|-Davinci\\b|\\b(GHS)\\b|\\b(Iznjie)\\b|\\b(9volt)\\b|\\[Lia\\]|-Lia\\b|\\b(kmplx)\\b|\\b(UWU)\\b|\\b(Koitern)\\b|\\b(Commie)\\b|\\b(Kaleido)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(SallySubs)\\b|\\b(CoalGirls)\\b\\b(ANThELIa)\\b|\\b(AP)\\b|\\b(BluDragon)\\b|\\b(D4C)\\b|\\b(Dragon-Releases)\\b|\\b(E[.-]N[.-]D)\\b|\\b(KAWAiREMUX)\\b|\\b(MKVULTRA)\\b|\\b(Raizel)\\b|\\b(REVO)\\b|\\[Spark\\]|-Spark\\b|\\b(SRLS)\\b|\\b(TTGA)\\b|\\b(ZR)\\b|\\[Afro\\]|-Afro\\b|\\[Akai\\]|-Akai\\b|\\[Almighty\\]|-Almighty\\b|\\[ANE\\]|-ANE|\\b(Asenshi)\\b|\\b(BlurayDesuYo)\\b|\\b(Bunny-Apocalypse)\\b|\\[CH\\]|-CH\\b|\\b(EJF)\\b|\\b(Exiled-Destiny|E-D)\\b|\\b(FFF)\\b|\\b(Final8)\\b|\\b(GS)\\b|\\[Harunatsu\\]|-Harunatsu\\b|\\[Impatience\\]|-Impatience\\b|\\b(Inka-Subs)\\b|\\[Judgment\\]|-Judgment\\b|\\[Kantai\\]|-Kantai\\b|\\b(LCE)\\b|\\b(Licca)\\b|\\[Nii-sama\\]|-Nii-sama\\b|\\b(niizk)\\b|\\b(Nishi-Taku)\\b|\\b(OnDeed)\\b|\\b(orz)\\b|\\b(PAS)\\b|\\b(peachflavored)\\b|\\b(Saizen)\\b|\\b(SCP-2223)\\b|\\b(SHiN-gx)\\b|\\b(SmugCat)\\b|\\[Soldado\\]|-Soldado\\b|\\[Sushi\\]|-Sushi\\b|\\[Vivid\\]|-Vivid\\b|\\[Watashi\\]|-Watashi\\b|\\[Yabai\\]|-Yabai\\b|\\b(Zurako)\\b|\\b(A-L)\\b|\\b(ANiHLS)\\b|\\b(CBM)\\b|\\b(DHD)\\b|\\b(DragsterPS)\\b|\\b(HAiKU)\\b|\\b(Hark0N)\\b|\\b(iAHD)\\b|\\b(inid4c)\\b|\\b(KS|KiyoshiStar)\\b|\\b(MCR)\\b|\\[NPC\\]|-NPC\\b|\\b(RedBlade)\\b|\\b(RH)\\b|\\b(SEV)\\b|\\[STRiFE\\]|-STRiFE\\b|\\b(TENEIGHTY)\\b|\\b(WaLMaRT)\\b|\\b(AkihitoSubs)\\b|\\b(Arukoru)\\b|\\[EDGE\\]|-EDGE\\b|\\[EMBER\\]|-EMBER\\b|\\[GHOST\\]|-GHOST\\b|\\[Judas\\]|-Judas|\\[naiyas\\]|-naiyas\\b|\\b(Nep[._-]Blanc)\\b|\\[Prof\\]|-Prof\\b|\\b(ShirÏƒ)\\b|\\[YURASUKA\\]|-YURASUKA\\b|\\b(Setsugen)\\b|\\b(Z4ST1N)\\b|\\[Cyan\\]|-Cyan\\b|\\[Dae\\]|-Dae\\b|\\[Gao\\]|-Gao\\b|\\b(HatSubs)\\b|\\[Pizza\\]|-Pizza\\b|\\b(Slyfox)\\b|\\b(SoLCE)\\b|\\[tenshi\\]|-tenshi|\\b(SubsPlease)\\b|\\b(SubsPlus\\+?)\\b|\\b(BlueLobster)\\b|\\b(Erai-raws)\\b|\\b(GST)\\b|\\b(HorribleRips)\\b|\\b(HorribleSubs)\\b|\\b(KAN3D2M)\\b|\\b(NanDesuKa)\\b|\\b(URANIME)\\b|\\b(VARYG)\\b|\\[ZigZag\\]|-ZigZa|\\b(GJM)\\b|\\b(SobsPlease)\\b|\\b(DameDesuYo)\\b|\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ|Flights|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES|decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN|CtrlHD|MainFrame|DON|W4NK3R|HQMUX|BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV|BBQ|c0kE|Chotab|CRiSC|D-Z0N3|Dariush|EbP|EDPH|Geek|LolHD|TayTO|TDD|TnP|VietHD|EA|HiDt|HiSD|QOQ|SA89|sbR|LoRD|playHD|ABBIE|AJP69|APEX|PAXA|PEXA|XEPA|BLUTONiUM|CMRG|CRFW|CRUD|FLUX|GNOME|KiNGS|Kitsune|NOSiViD|NTG|SiC|dB|MiU|monkee|MZABI|PHOENiX|playWEB|SbR|SMURF|TOMMY|XEBEC|4KBEC|CEBEX|ABBiE|CasStudio|RTN|T6D|ViSUM|3cTWeB|BTW|Cinefeel|CiT|Coo7|DEEP|END|ETHiCS|FC|iJP|iKA|iT00NZ|JETIX|KHN|KiMCHI|LAZY|NPMS|NYH|orbitron|PSiG|ROCCaT|RTFM|SDCC|SIGMA|SPiRiT|TVSmash|WELP|DRACULA|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H|ViSiON|DEFLATE|INFLATE)\\b|-BMF|-WiLDCAT)).)*$" }
      ],
    },
    {
      name: 'Shows',
      buttonData: [
        { name: 'All Shows', value: "\\b(BLURANiUM|FraMeSToR|PmP|decibeL|EPSiLON|HiFi|KRaLiMaRKo|playBD|PTer|SiCFoI|TRiToN|Chotab|CtrlHD|DON|EbP|NTb|SA89|sbR|ABBiE|AJP69|APEX|PAXA|PEXA|XEPA|CasStudio|CRFW|FLUX|HONE|KiNGS|Kitsune|monkee|NOSiViD|NTG|QOQ|RTN|SiC|T6D|TOMMY|ViSUM|3cTWeB|BLUTONiUM|BTW|Cinefeel|CiT|CMRG|Coo7|dB|DEEP|END|ETHiCS|FC|Flights|GNOME|iJP|iKA|iT00NZ|JETIX|KHN|KiMCHI|LAZY|MiU|MZABI|NPMS|NYH|orbitron|PHOENiX|playWEB|PSiG|ROCCaT|RTFM|SbR|SDCC|SIGMA|SMURF|SPiRiT|TEPES|TVSmash|WELP|XEBEC|4KBEC|CEBEX|DRACULA|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H|ViSiON|DEFLATE|INFLATE)\\b|-BMF" },
        { name: 'Remux Tiers', value: "\\b(BLURANiUM|FraMeSToR|PmP|decibeL|EPSiLON|HiFi|KRaLiMaRKo|playBD|PTer|SiCFoI|TRiToN)\\b|-BMF" },
        { name: 'HD Bluray Tiers', value: "\\b(Chotab|CtrlHD|DON|EbP|NTb|PTer|SA89|sbR)\\b" },
        { name: 'WEB Tiers', value: "\\b(ABBiE|AJP69|APEX|PAXA|PEXA|XEPA|CasStudio|CRFW|CtrlHD|FLUX|HONE|KiNGS|Kitsune|monkee|NOSiViD|NTb|NTG|QOQ|RTN|SiC|T6D|TOMMY|ViSUM|3cTWeB|BLUTONiUM|BTW|Chotab|Cinefeel|CiT|CMRG|Coo7|dB|DEEP|END|ETHiCS|FC|Flights|GNOME|iJP|iKA|iT00NZ|JETIX|KHN|KiMCHI|LAZY|MiU|MZABI|NPMS|NYH|orbitron|PHOENiX|playWEB|PSiG|ROCCaT|RTFM|SA89|SbR|SDCC|SIGMA|SMURF|SPiRiT|TEPES|TVSmash|WELP|XEBEC|4KBEC|CEBEX|DRACULA|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H|ViSiON|DEFLATE|INFLATE)\\b" },
        { name: 'Remux Tier 01', value: "\\b(BLURANiUM|FraMeSToR|PmP)\\b|-BMF" },
        { name: 'Remux Tier 02', value: "\\b(decibeL|EPSiLON|HiFi|KRaLiMaRKo|playBD|PTer|SiCFoI|TRiToN)\\b" },
        { name: 'HD Bluray Tier 01', value: "\\b(Chotab|CtrlHD|DON|EbP|NTb|PTer)\\b" },
        { name: 'HD Bluray Tier 02', value: "\\b(SA89|sbR)\\b" },
        { name: 'WEB Tier 01', value: "\\b(ABBiE|AJP69|APEX|PAXA|PEXA|XEPA|CasStudio|CRFW|CtrlHD|FLUX|HONE|KiNGS|Kitsune|monkee|NOSiViD|NTb|NTG|QOQ|RTN|SiC|T6D|TOMMY|ViSUM)\\b" },
        { name: 'WEB Tier 02', value: "\\b(3cTWeB|BLUTONiUM|BTW|Chotab|Cinefeel|CiT|CMRG|Coo7|dB|DEEP|END|ETHiCS|FC|Flights|GNOME|iJP|iKA|iT00NZ|JETIX|KHN|KiMCHI|LAZY|MiU|MZABI|NPMS|NYH|orbitron|PHOENiX|playWEB|PSiG|ROCCaT|RTFM|SA89|SbR|SDCC|SIGMA|SMURF|SPiRiT|TEPES|TVSmash|WELP|XEBEC|4KBEC|CEBEX)\\b" },
        { name: 'WEB Tier 03', value: "\\b(DRACULA|NINJACENTRAL|SLiGNOME|SwAgLaNdEr|T4H|ViSiON)\\b" },
        { name: 'WEB Scene', value: "\\b(DEFLATE|INFLATE)\\b" }
      ],
    },
    {
      name: 'Movies',
      buttonData: [
        { name: 'All Movies', value: "\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ|Flights|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES|decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN|CtrlHD|MainFrame|DON|W4NK3R|HQMUX|BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV|BBQ|c0kE|Chotab|CRiSC|D-Z0N3|Dariush|EbP|EDPH|Geek|LolHD|TayTO|TDD|TnP|VietHD|EA|HiDt|HiSD|QOQ|SA89|sbR|LoRD|playHD|ABBIE|AJP69|APEX|PAXA|PEXA|XEPA|BLUTONiUM|CMRG|CRFW|CRUD|FLUX|GNOME|KiNGS|Kitsune|NOSiViD|NTG|SiC|dB|MiU|monkee|MZABI|PHOENiX|playWEB|SbR|SMURF|TOMMY|XEBEC|4KBEC|CEBEX)\\b|-BMF|-WiLDCAT" },
        { name: 'Remux Tiers', value: "\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ|Flights|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES|decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN)\\b|-BMF|-WiLDCAT" },
        { name: 'UHD Bluray Tiers', value: "\\b(CtrlHD|MainFrame|DON|W4NK3R|HQMUX|BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV)\\b" },
        { name: 'HD Bluray Tiers', value: "\\b(BBQ|c0kE|Chotab|CRiSC|CtrlHD|D-Z0N3|Dariush|decibeL|DON|EbP|EDPH|Geek|LolHD|NCmt|PTer|TayTO|TDD|TnP|VietHD|ZQ|EA|HiDt|HiSD|iFT|NTb|QOQ|SA89|sbR|BHDStudio|hallowed|HONE|LoRD|playHD|SPHD|W4NK3R)\\b|-BMF" },
        { name: 'WEB Tiers', value: "\\b(ABBIE|AJP69|APEX|PAXA|PEXA|XEPA|BLUTONiUM|CMRG|CRFW|CRUD|FLUX|GNOME|HONE|KiNGS|Kitsune|NOSiViD|NTb|NTG|SiC|TEPES|dB|Flights|MiU|monkee|MZABI|PHOENiX|playWEB|SbR|SMURF|TOMMY|XEBEC|4KBEC|CEBEX)\\b" },
        { name: 'Remux Tier 01', value: "\\b(3L|BiZKiT|BLURANiUM|CiNEPHiLES|FraMeSToR|PmP|ZQ)\\b|-BMF|-WiLDCAT" },
        { name: 'Remux Tier 02', value: "\\b(Flights|NCmt|playBD|SiCFoI|SURFINBIRD|TEPES)\\b" },
        { name: 'Remux Tier 03', value: "\\b(decibeL|EPSiLON|HiFi|iFT|KRaLiMaRKo|NTb|PTP|SumVision|TOA|TRiToN)\\b" },
        { name: 'UHD Bluray Tier 01', value: "\\b(CtrlHD|MainFrame|DON|W4NK3R)\\b" },
        { name: 'UHD Bluray Tier 02', value: "\\b(HQMUX)\\b" },
        { name: 'UHD Bluray Tier 03', value: "\\b(BHDStudio|hallowed|HONE|PTer|SPHD|WEBDV)\\b" },
        { name: 'HD Bluray Tier 01', value: "\\b(BBQ|c0kE|Chotab|CRiSC|CtrlHD|D-Z0N3|Dariush|decibeL|DON|EbP|EDPH|Geek|LolHD|NCmt|PTer|TayTO|TDD|TnP|VietHD|ZQ)\\b|-BMF" },
        { name: 'HD Bluray Tier 02', value: "\\b(EA|HiDt|HiSD|iFT|NTb|QOQ|SA89|sbR)\\b" },
        { name: 'HD Bluray Tier 03', value: "\\b(BHDStudio|hallowed|HONE|LoRD|playHD|SPHD|W4NK3R)\\b" },
        { name: 'WEB Tier 01', value: "\\b(ABBIE|AJP69|APEX|PAXA|PEXA|XEPA|BLUTONiUM|CMRG|CRFW|CRUD|FLUX|GNOME|HONE|KiNGS|Kitsune|NOSiViD|NTb|NTG|SiC|TEPES)\\b" },
        { name: 'WEB Tier 02', value: "\\b(dB|Flights|MiU|monkee|MZABI|PHOENiX|playWEB|SbR|SMURF|TOMMY|XEBEC|4KBEC|CEBEX)\\b" },
        { name: 'WEB Tier 03', value: "\\b(GNOMiSSiON|NINJACENTRAL|ROCCaT|SiGMA|SLiGNOME|SwAgLaNdEr)\\b" }
      ],
    },
    {
      name: 'Anime',
      buttonData: [
        { name: 'All Anime', value: "(\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b|\\b(0x539)\\b|\\[Alt\\]|-Alt\\b|\\[ARC\\]|-ARC\\b|\\[Arid\\]|-Arid\\b|\\b(aro)\\b|\\b(Baws)\\b|\\b(BKC)\\b|\\b(Brrrrrrr)\\b|\\b(Chotab)\\b|\\[Crow\\]|-Crow\\b|\\b(CUNNY)\\b|\\b(CsS)\\b|\\b(D-Z0N3)\\b|\\b(Dae)\\b|\\b(Datte13)\\b|\\[Drag\\]|-Drag\\b|\\b(FLFL)\\b|\\b(hydes)\\b|\\b(iKaos)\\b|\\b(JySzE)\\b|\\b(LostYears)\\b|\\[Lulu\\]|-Lulu\\b|\\b(Matsya)\\b|\\b(MC)\\b|\\[Metal\\]|-Metal\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Noyr)\\b|\\b(NSDAB)\\b|\\b(Okay-Subs)\\b|\\b(pog42)\\b|\\b(pyroneko)\\b|\\b(RAI)\\b|\\b(Reza)\\b|\\b(Shimatta)\\b|\\[Smoke\\]|-Smoke\\b|\\b(Spirale)\\b|\\[Thighs\\]|-Thighs\\b|\\b(UDF)\\b|\\[Yuki\\]|-Yuki\\b|\\[AC\\]|-AC|\\b(ASC)\\b|\\b(AssMix)\\b|\\[Ayashii\\]|-Ayashii\\b|\\b(CBT)\\b|\\b(CTR)\\b|\\b(CyC)\\b|\\[Dekinai\\]|-Dekinai\\b|\\[EXP\\]|-EXP\\b|\\b(Galator)\\b|\\b(GSK[._-]kun)\\b|\\b(Holomux)\\b|\\b(IK)\\b|\\b(AnimeKaizoku)\\b|\\[Kaizoku\\]|-Kaizoku\\b|\\b(Kametsu)\\b|\\b(KH)\\b|\\b(kuchikirukia)\\b|\\b(LazyRemux)\\b|\\b(MK)\\b|\\[Mysteria\\]|-Mysteria\\b|\\b(Netaro)\\b|\\b(Pn8)\\b|\\b(Pookie)\\b|\\b(Quetzal)\\b|\\b(Rasetsu)\\b|\\[Senjou\\]|-Senjou\\b|\\b(ShowY)\\b|\\b(WBDP)\\b|\\b(WSE)\\b|\\b(Yoghurt)\\b|\\[YURI\\]|-YURI\\b|\\b(ZOIO)\\b|\\b(deanzel)\\b|\\b(ShadyCrab)\\b|\\b(hchcsen)\\b|\\b(NH)\\b|\\[Chimera\\]|-Chimera\\b|\\[Bulldog\\]|-Bulldog\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\b(Koten)\\b|\\b(Kulot)\\b|\\[Asakura\\]|-Asakura\\b|\\b(HaiveMind)\\b|\\b(mottoj)\\b|\\[Bolshevik\\]|-Bolshevik\\b|\\b(Scriptum)\\b|\\[SOLA\\]|-SOLA\\b|\\b(NTRM)\\b|\\b(ASO)\\b|\\b(MCLR)\\b|\\b(D3)\\b|\\b(AOmundson)\\b|\\b(RMX)\\b|\\b(karios)\\b|\\b(xPearse)\\b|\\b(kBaraka)\\b|\\b(SNSbu)\\b|\\[Orphan\\]|-Orphan\\b|\\b(Cait-Sidhe)\\b|\\b(THORA)\\b|\\[Davinci\\]|-Davinci\\b|\\b(GHS)\\b|\\b(Iznjie)\\b|\\b(9volt)\\b|\\[Lia\\]|-Lia\\b|\\b(kmplx)\\b|\\b(UWU)\\b|\\b(Koitern)\\b|\\b(Commie)\\b|\\b(Kaleido)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(SallySubs)\\b|\\b(CoalGirls)\\b|\\b(ANThELIa)\\b|\\b(AP)\\b|\\b(BluDragon)\\b|\\b(D4C)\\b|\\b(Dragon-Releases)\\b|\\b(E[.-]N[.-]D)\\b|\\b(KAWAiREMUX)\\b|\\b(MKVULTRA)\\b|\\b(Raizel)\\b|\\b(REVO)\\b|\\[Spark\\]|-Spark\\b|\\b(SRLS)\\b|\\b(TTGA)\\b|\\b(ZR)\\b|\\[Afro\\]|-Afro\\b|\\[Akai\\]|-Akai\\b|\\[Almighty\\]|-Almighty\\b|\\[ANE\\]|-ANE|\\b(Asenshi)\\b|\\b(BlurayDesuYo)\\b|\\b(Bunny-Apocalypse)\\b|\\[CH\\]|-CH\\b|\\b(EJF)\\b|\\b(Exiled-Destiny|E-D)\\b|\\b(FFF)\\b|\\b(Final8)\\b|\\b(GS)\\b|\\[Harunatsu\\]|-Harunatsu\\b|\\[Impatience\\]|-Impatience\\b|\\b(Inka-Subs)\\b|\\[Judgment\\]|-Judgment\\b|\\[Kantai\\]|-Kantai\\b|\\b(LCE)\\b|\\b(Licca)\\b|\\[Nii-sama\\]|-Nii-sama\\b|\\b(niizk)\\b|\\b(Nishi-Taku)\\b|\\b(OnDeed)\\b|\\b(orz)\\b|\\b(PAS)\\b|\\b(peachflavored)\\b|\\b(Saizen)\\b|\\b(SCP-2223)\\b|\\b(SHiN-gx)\\b|\\b(SmugCat)\\b|\\[Soldado\\]|-Soldado\\b|\\[Sushi\\]|-Sushi\\b|\\[Vivid\\]|-Vivid\\b|\\[Watashi\\]|-Watashi\\b|\\[Yabai\\]|-Yabai\\b|\\b(Zurako)\\b|\\b(A-L)\\b|\\b(ANiHLS)\\b|\\b(CBM)\\b|\\b(DHD)\\b|\\b(DragsterPS)\\b|\\b(HAiKU)\\b|\\b(Hark0N)\\b|\\b(iAHD)\\b|\\b(inid4c)\\b|\\b(KS|KiyoshiStar)\\b|\\b(MCR)\\b|\\[NPC\\]|-NPC\\b|\\b(RedBlade)\\b|\\b(RH)\\b|\\b(SEV)\\b|\\[STRiFE\\]|-STRiFE\\b|\\b(TENEIGHTY)\\b|\\b(WaLMaRT)\\b|\\b(AkihitoSubs)\\b|\\b(Arukoru)\\b|\\[EDGE\\]|-EDGE\\b|\\[EMBER\\]|-EMBER\\b|\\[GHOST\\]|-GHOST\\b|\\[Judas\\]|-Judas|\\[naiyas\\]|-naiyas\\b|\\b(Nep[._-]Blanc)\\b|\\[Prof\\]|-Prof\\b|\\b(ShirÏƒ)\\b|\\[YURASUKA\\]|-YURASUKA\\b|\\b(Setsugen)\\b|\\b(Z4ST1N)\\b|\\[Cyan\\]|-Cyan\\b|\\[Dae\\]|-Dae\\b|\\[Gao\\]|-Gao\\b|\\b(HatSubs)\\b|\\[Pizza\\]|-Pizza\\b|\\b(Slyfox)\\b|\\b(SoLCE)\\b|\\[tenshi\\]|-tenshi|\\b(SubsPlease)\\b|\\b(SubsPlus\\+?)\\b|\\b(BlueLobster)\\b|\\b(Erai-raws)\\b|\\b(GST)\\b|\\b(HorribleRips)\\b|\\b(HorribleSubs)\\b|\\b(KAN3D2M)\\b|\\b(NanDesuKa)\\b|\\b(URANIME)\\b|\\b(VARYG)\\b|\\[ZigZag\\]|-ZigZa|\\b(GJM)\\b|\\b(SobsPlease)\\b|\\b(DameDesuYo)\\b)" },
        { name: 'BD Tiers', value: "(\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b|\\b(0x539)\\b|\\[Alt\\]|-Alt\\b|\\[ARC\\]|-ARC\\b|\\[Arid\\]|-Arid\\b|\\b(aro)\\b|\\b(Baws)\\b|\\b(BKC)\\b|\\b(Brrrrrrr)\\b|\\b(Chotab)\\b|\\[Crow\\]|-Crow\\b|\\b(CUNNY)\\b|\\b(CsS)\\b|\\b(D-Z0N3)\\b|\\b(Dae)\\b|\\b(Datte13)\\b|\\[Drag\\]|-Drag\\b|\\b(FLFL)\\b|\\b(hydes)\\b|\\b(iKaos)\\b|\\b(JySzE)\\b|\\b(LostYears)\\b|\\[Lulu\\]|-Lulu\\b|\\b(Matsya)\\b|\\b(MC)\\b|\\[Metal\\]|-Metal\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Noyr)\\b|\\b(NSDAB)\\b|\\b(Okay-Subs)\\b|\\b(pog42)\\b|\\b(pyroneko)\\b|\\b(RAI)\\b|\\b(Reza)\\b|\\b(Shimatta)\\b|\\[Smoke\\]|-Smoke\\b|\\b(Spirale)\\b|\\[Thighs\\]|-Thighs\\b|\\b(UDF)\\b|\\[Yuki\\]|-Yuki\\b|\\[AC\\]|-AC|\\b(ASC)\\b|\\b(AssMix)\\b|\\[Ayashii\\]|-Ayashii\\b|\\b(CBT)\\b|\\b(CTR)\\b|\\b(CyC)\\b|\\[Dekinai\\]|-Dekinai\\b|\\[EXP\\]|-EXP\\b|\\b(Galator)\\b|\\b(GSK[._-]kun)\\b|\\b(Holomux)\\b|\\b(IK)\\b|\\b(AnimeKaizoku)\\b|\\[Kaizoku\\]|-Kaizoku\\b|\\b(Kametsu)\\b|\\b(KH)\\b|\\b(kuchikirukia)\\b|\\b(LazyRemux)\\b|\\b(MK)\\b|\\[Mysteria\\]|-Mysteria\\b|\\b(Netaro)\\b|\\b(Pn8)\\b|\\b(Pookie)\\b|\\b(Quetzal)\\b|\\b(Rasetsu)\\b|\\[Senjou\\]|-Senjou\\b|\\b(ShowY)\\b|\\b(WBDP)\\b|\\b(WSE)\\b|\\b(Yoghurt)\\b|\\[YURI\\]|-YURI\\b|\\b(ZOIO)\\b|\\b(deanzel)\\b|\\b(ShadyCrab)\\b|\\b(hchcsen)\\b|\\b(NH)\\b|\\[Chimera\\]|-Chimera\\b|\\[Bulldog\\]|-Bulldog\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\b(Koten)\\b|\\b(Kulot)\\b|\\[Asakura\\]|-Asakura\\b|\\b(HaiveMind)\\b|\\b(mottoj)\\b|\\[Bolshevik\\]|-Bolshevik\\b|\\b(Scriptum)\\b|\\[SOLA\\]|-SOLA\\b|\\b(NTRM)\\b|\\b(ASO)\\b|\\b(MCLR)\\b|\\b(D3)\\b|\\b(AOmundson)\\b|\\b(RMX)\\b|\\b(karios)\\b|\\b(xPearse)\\b|\\b(kBaraka)\\b|\\b(SNSbu)\\b|\\[Orphan\\]|-Orphan\\b|\\b(Cait-Sidhe)\\b|\\b(THORA)\\b|\\[Davinci\\]|-Davinci\\b|\\b(GHS)\\b|\\b(Iznjie)\\b|\\b(9volt)\\b|\\[Lia\\]|-Lia\\b|\\b(kmplx)\\b|\\b(UWU)\\b|\\b(Koitern)\\b|\\b(Commie)\\b|\\b(Kaleido)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(SallySubs)\\b|\\b(CoalGirls)\\b|\\b(ANThELIa)\\b|\\b(AP)\\b|\\b(BluDragon)\\b|\\b(D4C)\\b|\\b(Dragon-Releases)\\b|\\b(E[.-]N[.-]D)\\b|\\b(KAWAiREMUX)\\b|\\b(MKVULTRA)\\b|\\b(Raizel)\\b|\\b(REVO)\\b|\\[Spark\\]|-Spark\\b|\\b(SRLS)\\b|\\b(TTGA)\\b|\\b(ZR)\\b|\\[Afro\\]|-Afro\\b|\\[Akai\\]|-Akai\\b|\\[Almighty\\]|-Almighty\\b|\\[ANE\\]|-ANE|\\b(Asenshi)\\b|\\b(BlurayDesuYo)\\b|\\b(Bunny-Apocalypse)\\b|\\[CH\\]|-CH\\b|\\b(EJF)\\b|\\b(Exiled-Destiny|E-D)\\b|\\b(FFF)\\b|\\b(Final8)\\b|\\b(GS)\\b|\\[Harunatsu\\]|-Harunatsu\\b|\\[Impatience\\]|-Impatience\\b|\\b(Inka-Subs)\\b|\\[Judgment\\]|-Judgment\\b|\\[Kantai\\]|-Kantai\\b|\\b(LCE)\\b|\\b(Licca)\\b|\\[Nii-sama\\]|-Nii-sama\\b|\\b(niizk)\\b|\\b(Nishi-Taku)\\b|\\b(OnDeed)\\b|\\b(orz)\\b|\\b(PAS)\\b|\\b(peachflavored)\\b|\\b(Saizen)\\b|\\b(SCP-2223)\\b|\\b(SHiN-gx)\\b|\\b(SmugCat)\\b|\\[Soldado\\]|-Soldado\\b|\\[Sushi\\]|-Sushi\\b|\\[Vivid\\]|-Vivid\\b|\\[Watashi\\]|-Watashi\\b|\\[Yabai\\]|-Yabai\\b|\\b(Zurako)\\b|\\b(A-L)\\b|\\b(ANiHLS)\\b|\\b(CBM)\\b|\\b(DHD)\\b|\\b(DragsterPS)\\b|\\b(HAiKU)\\b|\\b(Hark0N)\\b|\\b(iAHD)\\b|\\b(inid4c)\\b|\\b(KS|KiyoshiStar)\\b|\\b(MCR)\\b|\\[NPC\\]|-NPC\\b|\\b(RedBlade)\\b|\\b(RH)\\b|\\b(SEV)\\b|\\[STRiFE\\]|-STRiFE\\b|\\b(TENEIGHTY)\\b|\\b(WaLMaRT)\\b|\\b(AkihitoSubs)\\b|\\b(Arukoru)\\b|\\[EDGE\\]|-EDGE\\b|\\[EMBER\\]|-EMBER\\b|\\[GHOST\\]|-GHOST\\b|\\[Judas\\]|-Judas|\\[naiyas\\]|-naiyas\\b|\\b(Nep[._-]Blanc)\\b|\\[Prof\\]|-Prof\\b|\\b(ShirÏƒ)\\b|\\[YURASUKA\\]|-YURASUKA\\b)" },
        { name: 'Web Tiers', value: "(\\b(Arg0)\\b|\\[Arid\\]|-Arid\\b|\\b(Baws)\\b|\\b(LostYears)\\b|\\b(LYS1TH3A)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\b(Setsugen)\\b|\\[smol\\]|-smol\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(Z4ST1N)\\b|\\b(ZeroBuild)\\b|\\b(0x539)\\b|\\[Asakura\\]|-Asakura\\b|\\[Cyan\\]|-Cyan\\b|\\[Dae\\]|-Dae\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\[Gao\\]|-Gao\\b|\\b(GSK[._-]kun)\\b|\\b(HatSubs)\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Okay-Subs)\\b|\\[Pizza\\]|-Pizza\\b|\\b(Reza)\\b|\\b(Slyfox)\\b|\\b(SoLCE)\\b|\\[tenshi\\]|-tenshi|\\b(SubsPlease)\\b|\\b(SubsPlus\\+?)\\b|\\b(ZR)\\b|\\b(BlueLobster)\\b|\\b(Erai-raws)\\b|\\b(GST)\\b|\\b(HorribleRips)\\b|\\b(HorribleSubs)\\b|\\b(KAN3D2M)\\b|\\b(KS|KiyoshiStar)\\b|\\[Lia\\]|-Lia\\b|\\b(NanDesuKa)\\b|\\b(URANIME)\\b|\\b(VARYG)\\b|\\[ZigZag\\]|-ZigZa|\\b(9volt)\\b|\\b(GJM)\\b|\\b(Kaleido)\\b|\\[Kantai\\]|-Kantai\\b|\\b(SobsPlease)\\b|\\b(Asenshi)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(Commie)\\b|\\b(DameDesuYo)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b)" },
        { name: 'Anime BD Tier 01 (Top SeaDex Muxers)', value: "(\\[Aergia\\]|-Aergia(?!-raws)\\b|\\b(Arg0)\\b|\\[Legion\\]|-Legion\\b|\\b(LYS1TH3A)\\b|\\b(OZR)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\[smol\\]|-smol\\b|\\[Vanilla\\]|-Vanilla\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(ZeroBuild)\\b)" },
        { name: 'Anime BD Tier 02 (SeaDex Muxers)', value: "(\\b(0x539)\\b|\\[Alt\\]|-Alt\\b|\\[ARC\\]|-ARC\\b|\\[Arid\\]|-Arid\\b|\\b(aro)\\b|\\b(Baws)\\b|\\b(BKC)\\b|\\b(Brrrrrrr)\\b|\\b(Chotab)\\b|\\[Crow\\]|-Crow\\b|\\b(CUNNY)\\b|\\b(CsS)\\b|\\b(D-Z0N3)\\b|\\b(Dae)\\b|\\b(Datte13)\\b|\\[Drag\\]|-Drag\\b|\\b(FLFL)\\b|\\b(hydes)\\b|\\b(iKaos)\\b|\\b(JySzE)\\b|\\b(LostYears)\\b|\\[Lulu\\]|-Lulu\\b|\\b(Matsya)\\b|\\b(MC)\\b|\\[Metal\\]|-Metal\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Noyr)\\b|\\b(NSDAB)\\b|\\b(Okay-Subs)\\b|\\b(pog42)\\b|\\b(pyroneko)\\b|\\b(RAI)\\b|\\b(Reza)\\b|\\b(Shimatta)\\b|\\[Smoke\\]|-Smoke\\b|\\b(Spirale)\\b|\\[Thighs\\]|-Thighs\\b|\\b(UDF)\\b|\\[Yuki\\]|-Yuki\\b)" },
        { name: 'Anime BD Tier 03 (SeaDex Muxers)', value: "(\\[AC\\]|-AC|\\b(ASC)\\b|\\b(AssMix)\\b|\\[Ayashii\\]|-Ayashii\\b|\\b(CBT)\\b|\\b(CTR)\\b|\\b(CyC)\\b|\\[Dekinai\\]|-Dekinai\\b|\\[EXP\\]|-EXP\\b|\\b(Galator)\\b|\\b(GSK[._-]kun)\\b|\\b(Holomux)\\b|\\b(IK)\\b|\\b(AnimeKaizoku)\\b|\\[Kaizoku\\]|-Kaizoku\\b|\\b(Kametsu)\\b|\\b(KH)\\b|\\b(kuchikirukia)\\b|\\b(LazyRemux)\\b|\\b(MK)\\b|\\[Mysteria\\]|-Mysteria\\b|\\b(Netaro)\\b|\\b(Pn8)\\b|\\b(Pookie)\\b|\\b(Quetzal)\\b|\\b(Rasetsu)\\b|\\[Senjou\\]|-Senjou\\b|\\b(ShowY)\\b|\\b(WBDP)\\b|\\b(WSE)\\b|\\b(Yoghurt)\\b|\\[YURI\\]|-YURI\\b|\\b(ZOIO)\\b)" },
        { name: 'Anime BD Tier 04 (SeaDex Muxers)', value: "(\\b(deanzel)\\b|\\b(ShadyCrab)\\b|\\b(hchcsen)\\b|\\b(NH)\\b|\\[Chimera\\]|-Chimera\\b|\\[Bulldog\\]|-Bulldog\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\b(Koten)\\b|\\b(Kulot)\\b|\\[Asakura\\]|-Asakura\\b|\\b(HaiveMind)\\b|\\b(mottoj)\\b|\\[Bolshevik\\]|-Bolshevik\\b|\\b(Scriptum)\\b|\\[SOLA\\]|-SOLA\\b|\\b(NTRM)\\b|\\b(ASO)\\b|\\b(MCLR)\\b|\\b(D3)\\b|\\b(AOmundson)\\b|\\b(RMX)\\b|\\b(karios)\\b|\\b(xPearse)\\b|\\b(kBaraka)\\b|\\b(SNSbu)\\b|\\[Orphan\\]|-Orphan\\b|\\b(Cait-Sidhe)\\b|\\b(THORA)\\b|\\[Davinci\\]|-Davinci\\b|\\b(GHS)\\b|\\b(Iznjie)\\b|\\b(9volt)\\b|\\[Lia\\]|-Lia\\b|\\b(kmplx)\\b|\\b(UWU)\\b|\\b(Koitern)\\b|\\b(Commie)\\b|\\b(Kaleido)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(SallySubs)\\b|\\b(CoalGirls)\\b)" },
        { name: 'Anime BD Tier 05 (Remuxes)', value: "(\\b(ANThELIa)\\b|\\b(AP)\\b|\\b(BluDragon)\\b|\\b(D4C)\\b|\\b(Dragon-Releases)\\b|\\b(E[.-]N[.-]D)\\b|\\b(KAWAiREMUX)\\b|\\b(MKVULTRA)\\b|\\b(Raizel)\\b|\\b(REVO)\\b|\\[Spark\\]|-Spark\\b|\\b(SRLS)\\b|\\b(TTGA)\\b|\\b(ZR)\\b)" },
        { name: 'Anime BD Tier 06 (FanSubs)', value: "(\\[Afro\\]|-Afro\\b|\\[Akai\\]|-Akai\\b|\\[Almighty\\]|-Almighty\\b|\\[ANE\\]|-ANE|\\b(Asenshi)\\b|\\b(BlurayDesuYo)\\b|\\b(Bunny-Apocalypse)\\b|\\[CH\\]|-CH\\b|\\b(EJF)\\b|\\b(Exiled-Destiny|E-D)\\b|\\b(FFF)\\b|\\b(Final8)\\b|\\b(GS)\\b|\\[Harunatsu\\]|-Harunatsu\\b|\\[Impatience\\]|-Impatience\\b|\\b(Inka-Subs)\\b|\\[Judgment\\]|-Judgment\\b|\\[Kantai\\]|-Kantai\\b|\\b(LCE)\\b|\\b(Licca)\\b|\\[Nii-sama\\]|-Nii-sama\\b|\\b(niizk)\\b|\\b(Nishi-Taku)\\b|\\b(OnDeed)\\b|\\b(orz)\\b|\\b(PAS)\\b|\\b(peachflavored)\\b|\\b(Saizen)\\b|\\b(SCP-2223)\\b|\\b(SHiN-gx)\\b|\\b(SmugCat)\\b|\\[Soldado\\]|-Soldado\\b|\\[Sushi\\]|-Sushi\\b|\\[Vivid\\]|-Vivid\\b|\\[Watashi\\]|-Watashi\\b|\\[Yabai\\]|-Yabai\\b|\\b(Zurako)\\b)" },
        { name: 'Anime BD Tier 07 (P2P/Scene)', value: "(\\b(A-L)\\b|\\b(ANiHLS)\\b|\\b(CBM)\\b|\\b(DHD)\\b|\\b(DragsterPS)\\b|\\b(HAiKU)\\b|\\b(Hark0N)\\b|\\b(iAHD)\\b|\\b(inid4c)\\b|\\b(KS|KiyoshiStar)\\b|\\b(MCR)\\b|\\[NPC\\]|-NPC\\b|\\b(RedBlade)\\b|\\b(RH)\\b|\\b(SEV)\\b|\\[STRiFE\\]|-STRiFE\\b|\\b(TENEIGHTY)\\b|\\b(WaLMaRT)\\b)" },
        { name: 'Anime BD Tier 08 (Mini Encodes)', value: "(\\b(AkihitoSubs)\\b|\\b(Arukoru)\\b|\\[EDGE\\]|-EDGE\\b|\\[EMBER\\]|-EMBER\\b|\\[GHOST\\]|-GHOST\\b|\\[Judas\\]|-Judas|\\[naiyas\\]|-naiyas\\b|\\b(Nep[._-]Blanc)\\b|\\[Prof\\]|-Prof\\b|\\b(ShirÏƒ)\\b|\\[YURASUKA\\]|-YURASUKA\\b)" },
        { name: 'Anime Web Tier 01 (Muxers)', value: "(\\b(Arg0)\\b|\\[Arid\\]|-Arid\\b|\\b(Baws)\\b|\\b(LostYears)\\b|\\b(LYS1TH3A)\\b|\\[sam\\]|-sam\\b|\\b(SCY)\\b|\\b(Setsugen)\\b|\\[smol\\]|-smol\\b|\\[Vodes\\]|(?<!Not)-Vodes\\b|\\b(Z4ST1N)\\b|\\b(ZeroBuild)\\b)" },
        { name: 'Anime Web Tier 02 (Top FanSubs)', value: "(\\b(0x539)\\b|\\[Asakura\\]|-Asakura\\b|\\[Cyan\\]|-Cyan\\b|\\[Dae\\]|-Dae\\b|\\[Foxtrot\\]|-Foxtrot\\b|\\[Gao\\]|-Gao\\b|\\b(GSK[._-]kun)\\b|\\b(HatSubs)\\b|\\b(MTBB)\\b|\\[Not-Vodes\\]|-Not-Vodes\\b|\\b(Okay-Subs)\\b|\\[Pizza\\]|-Pizza\\b|\\b(Reza)\\b|\\b(Slyfox)\\b|\\b(SoLCE)\\b|\\[tenshi\\]|-tenshi)" },
        { name: 'Anime Web Tier 03 (Official Subs)', value: "(\\b(SubsPlease)\\b|\\b(SubsPlus\\+?)\\b|\\b(ZR)\\b)" },
        { name: 'Anime Web Tier 04 (Official Subs)', value: "(\\b(BlueLobster)\\b|\\b(Erai-raws)\\b|\\b(GST)\\b|\\b(HorribleRips)\\b|\\b(HorribleSubs)\\b|\\b(KAN3D2M)\\b|\\b(KS|KiyoshiStar)\\b|\\[Lia\\]|-Lia\\b|\\b(NanDesuKa)\\b|\\b(URANIME)\\b|\\b(VARYG)\\b|\\[ZigZag\\]|-ZigZa)" },
        { name: 'Anime Web Tier 05 (FanSubs)', value: "(\\b(9volt)\\b|\\b(GJM)\\b|\\b(Kaleido)\\b|\\[Kantai\\]|-Kantai\\b|\\b(SobsPlease)\\b)" },
        { name: 'Anime Web Tier 06 (FanSubs)', value: "(\\b(Asenshi)\\b|\\[Chihiro\\]|-Chihiro\\b|\\b(Commie)\\b|\\b(DameDesuYo)\\b|\\[Doki\\]|-Doki\\b|\\[Tsundere\\]|-Tsundere(?!-)\\b)" }
      ],
    },
    {
      name: 'Extra',
      buttonData: [
        { name: 'Extra', value: "\\b(QxR|Silence|Vyndros|ReVyndros|Ghost|Tigole|D3g|TAoE|PSA|BeiTai|userHEVC)\\b" },
      ],
    },
  ];

  class NotificationManager {
    static create(message) {
      const notification = document.createElement('div');
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '5px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontSize: '12px',
        zIndex: '1000',
        transition: 'opacity 0.5s',
      });

      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), CONFIG.FADE_DURATION);
      }, CONFIG.NOTIFICATION_DURATION);
    }
  }

  class ButtonManager {
    constructor() {
      this.buttons = new Set();
      this.currentOpenDropdown = null;
      this.dropdownMenus = new Set();
      this.container = null;
      this.initialized = false;
      this.retryCount = 0;
    }

    cleanup() {
      this.dropdownMenus.forEach(menu => menu.remove());
      this.dropdownMenus.clear();
      this.buttons.forEach(button => button.remove());
      this.buttons.clear();
      this.currentOpenDropdown = null;
      this.container = null;
      this.initialized = false;
      this.retryCount = 0;
    }

    initialize(container) {
      if (!container || (this.initialized && this.container === container)) return;

      this.cleanup();
      this.container = container;

      BUTTON_DATA.forEach(dropdown => {
        this.createDropdown(dropdown.name, dropdown.buttonData);
      });

      this.initialized = true;
      this.retryCount = 0;
    }

    createDropdown(name, buttonData) {
      if (!this.container || this.buttons.has(name)) return;

      const dropdownButton = document.createElement('span');
      dropdownButton.textContent = name;
      dropdownButton.className = CONFIG.BUTTON_STYLES.base;
      dropdownButton.style.backgroundColor = CONFIG.BUTTON_STYLES.colors.default;
      dropdownButton.style.marginRight = '0.5rem';
      dropdownButton.style.border = CONFIG.BUTTON_STYLES.dropdownButton.border;
      dropdownButton.style.position = 'relative';

      this.container.appendChild(dropdownButton);
      this.buttons.add(dropdownButton);

      const dropdownMenu = this.createDropdownMenu(buttonData, dropdownButton);
      if (dropdownMenu) {
        document.body.appendChild(dropdownMenu);
        this.dropdownMenus.add(dropdownMenu);
        this.setupDropdownListeners(dropdownButton, dropdownMenu);
      }
    }

    createDropdownMenu(buttonData, buttonElement) {
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = CONFIG.DROPDOWN_STYLES.base;
      dropdownMenu.style.display = CONFIG.DROPDOWN_STYLES.display;
      dropdownMenu.style.position = 'fixed';
      dropdownMenu.style.zIndex = CONFIG.DROPDOWN_STYLES.zIndex;

      buttonData.forEach(data => {
        const item = document.createElement('div');
        item.textContent = data.name;
        item.className = CONFIG.DROPDOWN_STYLES.item;

        item.addEventListener('click', () => {
          this.handleButtonClick(data.value, data.name);
          dropdownMenu.style.display = 'none';
          this.currentOpenDropdown = null;
        });

        dropdownMenu.appendChild(item);
      });

      return dropdownMenu;
    }

    setupDropdownListeners(dropdownButton, dropdownMenu) {
      dropdownButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.currentOpenDropdown && this.currentOpenDropdown !== dropdownMenu) {
          this.currentOpenDropdown.style.display = 'none';
        }
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        this.currentOpenDropdown = dropdownMenu.style.display === 'block' ? dropdownMenu : null;

        if (this.currentOpenDropdown) {
          const rect = dropdownButton.getBoundingClientRect();
          dropdownMenu.style.top = `${window.scrollY + rect.bottom}px`;
          dropdownMenu.style.left = `${rect.left}px`;
        }
      });

      dropdownMenu.addEventListener('mouseover', (event) => {
        if (event.target.classList.contains(CONFIG.DROPDOWN_STYLES.item)) {
          event.target.style.backgroundColor = CONFIG.BUTTON_STYLES.colors.hover;
        }
      });

      dropdownMenu.addEventListener('mouseout', (event) => {
        if (event.target.classList.contains(CONFIG.DROPDOWN_STYLES.item)) {
          event.target.style.backgroundColor = '';
        }
      });

      // Close dropdown when clicking anywhere outside
      document.addEventListener('click', (event) => {
        if (this.currentOpenDropdown && !dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
          this.currentOpenDropdown.style.display = 'none';
          this.currentOpenDropdown = null;
        }
      });
    }

    handleButtonClick(value, name) {
      navigator.clipboard.writeText(value)
        .then(() => NotificationManager.create(`Regex copied to clipboard`))
        .catch(err => {
          console.error('Failed to copy text: ', err);
          NotificationManager.create('Failed to copy text. Please try again.');
        });
    }
  }

  class PageManager {
    constructor() {
      this.buttonManager = new ButtonManager();
      this.lastUrl = null;
      this.checkInterval = null;
      this.observer = null;
      this.initialized = false;
    }

    init() {
      this.setupURLObserver();
      this.setupMutationObserver();
      this.setupIntervalCheck();
      this.checkPage(true);
    }

    setupURLObserver() {
      const pushState = history.pushState;
      history.pushState = (...args) => {
        pushState.apply(history, args);
        this.handleUrlChange();
      };

      const replaceState = history.replaceState;
      history.replaceState = (...args) => {
        replaceState.apply(history, args);
        this.handleUrlChange();
      };

      window.addEventListener('popstate', () => this.handleUrlChange());
      window.addEventListener('hashchange', () => this.handleUrlChange());
    }

    handleUrlChange() {
      this.buttonManager.cleanup();
      this.checkPage(true);
    }

    setupMutationObserver() {
      if (this.observer) {
        this.observer.disconnect();
      }

      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            this.checkPage(false);
            break;
          }
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    setupIntervalCheck() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      this.checkInterval = setInterval(() => this.checkPage(false), CONFIG.CHECK_INTERVAL);
    }

    checkPage(isUrlChange = false) {
      const currentUrl = window.location.href;
      const isRelevantPage = /debridmediamanager\.com\/(movie|show)\/[^\/]+/.test(currentUrl);

      if (!isRelevantPage) {
        this.buttonManager.cleanup();
        return;
      }

      const container = document.querySelector(CONFIG.CONTAINER_SELECTOR);

      if (!container) {
        if (isUrlChange || !this.buttonManager.initialized) {
          if (this.buttonManager.retryCount < CONFIG.MAX_RETRIES) {
            this.buttonManager.retryCount++;
            return;
          }
        }
        return;
      }

      if (!this.buttonManager.initialized || this.buttonManager.container !== container) {
        this.buttonManager.initialize(container);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new PageManager().init();
    });
  } else {
    new PageManager().init();
  }
})();
