// ==UserScript==
// @name         Medal Detector
// @namespace    eaglewing91.torn.medaldetector
// @version      2.1.0
// @description  Track every Torn honour and medal, see your next award for each stat, and set daily goals towards them. Uses only the official Torn API.
// @author       Eaglewing [571041]
// @license      MIT
// @homepageURL  https://github.com/Eaglewing91/Medal-Detector
// @supportURL   https://github.com/Eaglewing91/Medal-Detector/issues
// @updateURL    https://raw.githubusercontent.com/Eaglewing91/Medal-Detector/main/medal-detector.user.js
// @downloadURL  https://raw.githubusercontent.com/Eaglewing91/Medal-Detector/main/medal-detector.user.js
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @connect      api.torn.com
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * Medal Detector v2.1.0
 * Copyright (c) 2026 Eaglewing [571041]. Released under the MIT licence (see LICENSE).
 */

/*
 * COMPLIANCE NOTES (Torn scripting rules)
 * - Every network request goes to api.torn.com: one user call per refresh (personalstats, profile,
 *   honors, medals, battlestats, workstats, education, perks) and torn -> honors, medals once a day.
 *   Timed API calls are allowed. One Limited key covers everything.
 * - It also re-checks the API a few seconds after you click something in Torn or return to the tab.
 *   It only listens for your clicks; it never clicks, submits or requests Torn pages itself.
 * - The script never requests torn.com pages and never clicks, submits or changes anything in the game.
 *   Links in the panel are ordinary links that only navigate when YOU click them.
 * - Your API key and all data stay in Tampermonkey's own storage on this device
 *   (not page localStorage). The key is only ever sent to api.torn.com.
 * - All open Torn tabs share one cache, so there is at most one stats call per refresh interval.
 * - No websockets, no outside websites, no eval.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Stat catalogue (v1 personalstats keys)                             */
  /* ------------------------------------------------------------------ */
  const STATS = [
    // group, key, label, link, divisor (for display units)
    ['Jail', 'peoplebusted', 'Busts', '/jailview.php'],
    ['Jail', 'peoplebought', 'Bails', '/jailview.php'],
    ['Hospital', 'bloodwithdrawn', 'Blood bags filled', '/item.php'],
    ['Hospital', 'revives', 'Revives', '/hospitalview.php'],
    ['Hospital', 'medicalitemsused', 'Medical items used', '/item.php'],
    ['Jail', 'jailed', 'Times jailed', ''],
    ['Hospital', 'hospital', 'Times hospitalised', ''],
    ['Attacking', 'attackswon', 'Attacks won', ''],
    ['Attacking', 'defendswon', 'Defends won', ''],
    ['Attacking', 'attackswonabroad', 'Attacks won abroad', ''],
    ['Attacking', 'attackhits', 'Attack hits', ''],
    ['Attacking', 'attackcriticalhits', 'Critical hits', ''],
    ['Attacking', 'onehitkills', 'One hit kills', ''],
    ['Attacking', 'attacksstealthed', 'Stealthed attacks', ''],
    ['Attacking', 'attacksassisted', 'Assists', ''],
    ['Attacking', 'retals', 'Retaliations', ''],
    ['Attacking', 'rankedwarhits', 'Ranked war hits', ''],
    ['Attacking', 'unarmoredwon', 'Unarmoured wins', ''],
    ['Attacking', 'attackdamage', 'Total damage dealt', ''],
    ['Attacking', 'bestdamage', 'Best single hit', '', 1, true],
    ['Attacking', 'respectforfaction', 'Respect earned', ''],
    ['Finishing hits', 'axehits', 'Clubbing hits', ''],
    ['Finishing hits', 'chahits', 'Mechanical hits', ''],
    ['Finishing hits', 'grehits', 'Temporary hits', ''],
    ['Finishing hits', 'h2hhits', 'Hand-to-hand hits', ''],
    ['Finishing hits', 'heahits', 'Heavy artillery hits', ''],
    ['Finishing hits', 'machits', 'Machine gun hits', ''],
    ['Finishing hits', 'piehits', 'Piercing hits', ''],
    ['Finishing hits', 'pishits', 'Pistol hits', ''],
    ['Finishing hits', 'rifhits', 'Rifle hits', ''],
    ['Finishing hits', 'shohits', 'Shotgun hits', ''],
    ['Finishing hits', 'slahits', 'Slashing hits', ''],
    ['Finishing hits', 'smghits', 'SMG hits', ''],
    ['Travel', 'traveltimes', 'Trips abroad', '/travelagency.php'],
    ['Travel', 'traveltime', 'Time travelling (hours)', '/travelagency.php', 3600],
    ['Travel', 'argtravel', 'Trips to Argentina', '/travelagency.php'],
    ['Travel', 'cantravel', 'Trips to Canada', '/travelagency.php'],
    ['Travel', 'caytravel', 'Trips to Cayman Islands', '/travelagency.php'],
    ['Travel', 'chitravel', 'Trips to China', '/travelagency.php'],
    ['Travel', 'dubtravel', 'Trips to UAE', '/travelagency.php'],
    ['Travel', 'hawtravel', 'Trips to Hawaii', '/travelagency.php'],
    ['Travel', 'japtravel', 'Trips to Japan', '/travelagency.php'],
    ['Travel', 'lontravel', 'Trips to the UK', '/travelagency.php'],
    ['Travel', 'mextravel', 'Trips to Mexico', '/travelagency.php'],
    ['Travel', 'soutravel', 'Trips to South Africa', '/travelagency.php'],
    ['Travel', 'switravel', 'Trips to Switzerland', '/travelagency.php'],
    ['Items', 'candyused', 'Candy eaten', '/item.php'],
    ['Items', 'energydrinkused', 'Energy drinks used', '/item.php'],
    ['Items', 'alcoholused', 'Alcohol drunk', '/item.php'],
    ['Items', 'boostersused', 'Boosters used', '/item.php'],
    ['Items', 'booksread', 'Books read', '/item.php'],
    ['Drugs', 'drugsused', 'Drugs taken', '/item.php'],
    ['Drugs', 'cantaken', 'Cannabis taken', '/item.php'],
    ['Drugs', 'exttaken', 'Ecstasy taken', '/item.php'],
    ['Drugs', 'kettaken', 'Ketamine taken', '/item.php'],
    ['Drugs', 'lsdtaken', 'LSD taken', '/item.php'],
    ['Drugs', 'opitaken', 'Opium taken', '/item.php'],
    ['Drugs', 'pcptaken', 'PCP taken', '/item.php'],
    ['Drugs', 'shrtaken', 'Shrooms taken', '/item.php'],
    ['Drugs', 'spetaken', 'Speed taken', '/item.php'],
    ['Drugs', 'victaken', 'Vicodin taken', '/item.php'],
    ['Drugs', 'xantaken', 'Xanax taken', '/item.php'],
    ['Drugs', 'overdosed', 'Overdoses', ''],
    ['Crimes & finds', 'criminaloffenses', 'Criminal offences', '/loader.php?sid=crimes'],
    ['Crimes & finds', 'cityfinds', 'City finds', '/city.php'],
    ['Crimes & finds', 'dumpfinds', 'Dump finds', '/dump.php'],
    ['Crimes & finds', 'itemsdumped', 'Items trashed', '/dump.php'],
    ['Missions & bounties', 'missionscompleted', 'Missions completed', '/loader.php?sid=missions'],
    ['Missions & bounties', 'bountiescollected', 'Bounties collected', '/bounties.php'],
    ['Missions & bounties', 'totalbountyreward', 'Bounty rewards earned ($)', '/bounties.php'],
    ['Racing', 'racesentered', 'Races entered', '/loader.php?sid=racing'],
    ['Racing', 'raceswon', 'Races won', '/loader.php?sid=racing'],
    ['Other', 'refills', 'Energy refills', '/points.php'],
    ['Other', 'nerverefills', 'Nerve refills', '/points.php'],
    ['Other', 'tokenrefills', 'Token refills', '/points.php'],
    ['Other', 'useractivity', 'Time active (minutes)', '', 60],
    ['Other', 'bestactivestreak', 'Best activity streak (days)', '', 1, true],
    ['Other', 'activestreak', 'Current activity streak (days)', '', 1, true],
    ['Other', 'daysbeendonator', 'Days as a donator', '/donator.php', 1, true],
    ['Other', 'networth', 'Networth ($)', '', 1, true],
    // Not personal stats: read from your profile in the same API call
    ['Profile', '__level', 'Level', '', 1, true],
    ['Profile', '__age', 'Account age (days)', '', 1, true],
    ['Profile', '__factiondays', 'Days in faction', '/factions.php', 1, true],
    ['Profile', '__married', 'Days married', '', 1, true],
    ['Profile', '__awards', 'Total awards (honours + medals)', '/page.php?sid=awards', 1, true],
    ['Finishing hits', '__warmachine', 'Lowest finishing-hit category (War Machine)', ''],
    ['Attacking', '__007', 'Lower of attacks won / defends won (007)', ''],
    ['Attacking', 'bestkillstreak', 'Best kill streak', '', 1, true],
    ['Attacking', 'roundsfired', 'Rounds fired', ''],
    ['Attacking', 'specialammoused', 'Special ammo used', ''],
    ['Attacking', 'hollowammoused', 'Hollow Point rounds used', ''],
    ['Attacking', 'piercingammoused', 'Piercing rounds used', ''],
    ['Attacking', 'incendiaryammoused', 'Incendiary rounds used', ''],
    ['Attacking', 'tracerammoused', 'Tracer rounds used', ''],
    ['Attacking', 'attacksdraw', 'Stalemates', ''],
    ['Attacking', 'yourunaway', 'Times you ran away', ''],
    ['Attacking', 'theyrunaway', 'Times opponents ran away', ''],
    ['Crimes & finds', 'organisedcrimes', 'Organised crimes', '/factions.php?step=your#/tab=crimes'],
    ['Crimes & finds', 'theft', 'Theft crimes', '/loader.php?sid=crimes'],
    ['Crimes & finds', 'cybercrime', 'Computer crimes (cybercrime)', '/loader.php?sid=crimes'],
    ['Crimes & finds', 'fraud', 'Fraud crimes', '/loader.php?sid=crimes'],
    ['Crimes & finds', 'virusescoded', 'Viruses coded', ''],
    ['Missions & bounties', 'contractscompleted', 'Contracts completed', '/loader.php?sid=missions'],
    ['Missions & bounties', 'missioncreditsearned', 'Mission credits earned', '/loader.php?sid=missions'],
    ['Racing', 'racingpointsearned', 'Racing points earned', '/loader.php?sid=racing'],
    ['Racing', 'racingskill', 'Racing skill', '/loader.php?sid=racing', 1, true],
    ['Trading', 'auctionswon', 'Auctions won', '/amarket.php'],
    ['Trading', 'bazaarcustomers', 'Bazaar customers', '/bazaar.php'],
    ['Trading', 'pointssold', 'Points sold on the market', '/pmarket.php'],
    ['Trading', 'stockpayouts', 'Stock payouts received', '/page.php?sid=stocks'],
    ['Travel', 'itemsboughtabroad', 'Items imported from abroad', '/travelagency.php'],
    ['Other', 'jobpointsused', 'Job points used', '/jobs.php'],
    ['Other', 'statenhancersused', 'Stat enhancers used', '/item.php'],
    // From battle stats, working stats, education and perks
    ['Gym & work', '__str', 'Strength', '/gym.php', 1, true],
    ['Gym & work', '__def', 'Defense', '/gym.php', 1, true],
    ['Gym & work', '__spd', 'Speed', '/gym.php', 1, true],
    ['Gym & work', '__dex', 'Dexterity', '/gym.php', 1, true],
    ['Gym & work', '__manual', 'Manual labor', '/jobs.php', 1, true],
    ['Gym & work', '__intel', 'Intelligence', '/jobs.php', 1, true],
    ['Gym & work', '__endu', 'Endurance', '/jobs.php', 1, true],
    ['Gym & work', '__edu', 'Education courses completed', '/page.php?sid=education', 1, true],
    ['Gym & work', '__perks', 'Personal perks', '', 1, true],
    ['Gym & work', '__total', 'Total battle stats', '/gym.php', 1, true],
    ['Gym & work', '__workmax', 'Highest working stat', '/jobs.php', 1, true],
  ].map(([group, key, label, link, div, milestoneOnly]) => ({ group, key, label, link, div: div || 1, milestoneOnly: !!milestoneOnly }));
  const isVirtual = (k) => k.startsWith('__');
  // Shown on cards where the stat-to-award link is a best match rather than exact.
  const STAT_NOTE = {
    theft: "Uses the API's older theft counter, which may not keep up with Crimes 2.0. Check the number against your profile.",
    cybercrime: "Uses the API's older cybercrime counter (closest match to computer crimes), which may not keep up with Crimes 2.0.",
    fraud: "Uses the API's older fraud counter (closest match to arson/fraud crimes), which may not keep up with Crimes 2.0.",
    pointssold: "This API counter is a legacy field and may be out of date.",
    stockpayouts: "This API counter is a legacy field and may be out of date.",
    __warmachine: 'Your lowest finishing-hit count across all 12 weapon categories. Every category needs to reach the target.',
    __007: 'The lower of your attacks won and defends won. Both need to reach the target.',
    __total: 'Strength + defense + speed + dexterity.',
    __workmax: 'Your highest working stat (manual labor, intelligence or endurance).',
    bestactivestreak: 'Your best run of consecutive days online.',
  };

  /* ------------------------------------------------------------------ */
  /*  Award matching: honour/medal description -> stat that tracks it    */
  /*  Order matters: more specific rules first.                          */
  /* ------------------------------------------------------------------ */
  const TRAVEL_WORD = /travel|fly|flight|trip|visit/i;
  const AWARD_RULES = [
    // ---- Not countable from any stat: one-offs, conditions in a single action, combos ----
    [/fail(ed)?\s+(to\s+)?bust/i, null],
    [/\brefer/i, null],
    [/skill in hunting|hunting skill/i, null], // hunting skill isn't in the API
    [/\bdefeat someone\b|battle stats than you|fellow faction member|your spouse|married couple|body parts|co-worker|defend against someone/i, null],
    // Crimes 2.0 skills and feats have no API counter
    [/skill level of|search for cash|bootlegging|shoplifting|graffiti|card skimming|skimmer|card details|burgl|pickpocket|hustling|disposal|cracking|forgery|scamming|\barson\b(?!\/fraud)|rotten|dvds?\b|\bbeach\b|dead body|temptation/i, null],
    [/market value|single item|12 gauge/i, null],
    // Single best hit (stat exists); "exactly" one-offs are excluded below
    [/at least [\d,]+ damage in a single hit/i, 'bestdamage'],
    [/facebook/i, null],
    [/finishing hits in every category/i, '__warmachine'],
    [/[\d,]+ attacks and [\d,]+ defends/i, '__007'],
    [/only 1% life|\bexactly\b|in a row|within \d+ minutes?|from full life|random chance|\bsingle (hit|mugging|game|car|chain|stock market sale)\b/i, null],
    [/racing class|\bgame rank\b|\brank\b/i, null],
    [/complete all classes|gym memberships|endurance challenge|tier \d+ mods/i, null],
    [/login on|purchased from|competition|community event|easter eggs?|rollback|forgiven|dog tag|newspaper|dirty bomb|starter jobs/i, null],
    [/token refill|refill.*tokens?/i, 'tokenrefills'],
    [/compan(y|ies)|director|casino|poker|roulette|slots?\b|slot machine|lottery|lotteries|jackpot|blackjack|high-low|wheel of|church|propert(y|ies)|airstrip|yacht|donat(e|ion)\b|credit score|city bank|invest|item market/i, null],
    [/stock market|profit of/i, null],
    // Old crime types with no API counter
    [/drug deal|drug crimes?|bootlegging|murders?\b|auto theft|gta\b|\barson\b(?!\/fraud)|other crimes|shoplifting/i, null],
    // ---- Crimes ----
    [/organi[sz]ed crimes?/i, 'organisedcrimes'],
    [/criminal offen[cs]es/i, 'criminaloffenses'],
    [/theft crimes?|\bthefts\b/i, 'theft'],
    [/computer crimes?|virus crimes?/i, 'cybercrime'],
    [/fraud crimes?|arson\/fraud/i, 'fraud'],
    [/\bviruses\b/i, 'virusescoded'],
    // ---- Jail & hospital ----
    [/\bbust/i, 'peoplebusted'],
    [/\bbails?\b/i, 'peoplebought'],
    [/blood bag/i, 'bloodwithdrawn'],
    [/\brevive/i, 'revives'],
    [/medical item/i, 'medicalitemsused'],
    // ---- Attacking ----
    [/kill ?streak/i, 'bestkillstreak'],
    [/one[- ]hit kill/i, 'onehitkills'],
    [/critical hit/i, 'attackcriticalhits'],
    [/stealth/i, 'attacksstealthed'],
    [/retaliat/i, 'retals'],
    [/\bassist/i, 'attacksassisted'],
    [/ranked war/i, 'rankedwarhits'],
    [/stalemate/i, 'attacksdraw'],
    [/hollow point/i, 'hollowammoused'],
    [/piercing rounds/i, 'piercingammoused'],
    [/incendiary rounds/i, 'incendiaryammoused'],
    [/tracer rounds/i, 'tracerammoused'],
    [/special ammunition/i, 'specialammoused'],
    [/rounds\b/i, 'roundsfired'],
    [/enem(y|ies) ran away|opponents? ran away|ran away from you/i, 'theyrunaway'],
    [/\brun away\b|\bran away\b/i, 'yourunaway'],
    [/unarmou?red|without (wearing )?(any )?armou?r/i, 'unarmoredwon'],
    [/club|axe/i, 'axehits'],
    [/mechanical/i, 'chahits'],
    [/temporary/i, 'grehits'],
    [/hand[- ]to[- ]hand|\bfists?\b|unarmed/i, 'h2hhits'],
    [/heavy artillery/i, 'heahits'],
    [/sub[- ]?machine|\bsmgs?\b/i, 'smghits'],
    [/machine ?guns?/i, 'machits'],
    [/piercing/i, 'piehits'],
    [/pistol/i, 'pishits'],
    [/rifle/i, 'rifhits'],
    [/shotgun/i, 'shohits'],
    [/slashing/i, 'slahits'],
    [/attacks?\b.*\babroad|abroad.*\battacks?\b|while abroad/i, 'attackswonabroad'],
    [/\bdefend/i, 'defendswon'],
    [/\bdamage\b/i, 'attackdamage'],
    [/\brespect\b/i, 'respectforfaction'],
    [/\b(win|won|defeat)\b.*\battacks?\b|\battacks? won/i, 'attackswon'],
    [/^\s*achieve [\d,]+ hits\b/i, 'attackhits'],
    // ---- Gym, work, education, perks (optional extra stats) ----
    [/total stats/i, '__total'],
    [/any working stat/i, '__workmax'],
    [/\bstrength\b/i, '__str'],
    [/\bdefen[cs]e\b/i, '__def'],
    [/\bdexterity\b/i, '__dex'],
    [/\bspeed\b(?!.*\b(take|taken|use|dose))/i, '__spd', /gain|attain|reach|achieve/i],
    [/manual labou?r/i, '__manual'],
    [/intelligence/i, '__intel'],
    [/endurance/i, '__endu'],
    [/education courses?/i, '__edu'],
    [/personal perks?/i, '__perks'],
    [/total awards/i, '__awards'],
    // ---- Travel ----
    [/argentina/i, 'argtravel', TRAVEL_WORD],
    [/canada/i, 'cantravel', TRAVEL_WORD],
    [/cayman/i, 'caytravel', TRAVEL_WORD],
    [/china/i, 'chitravel', TRAVEL_WORD],
    [/\buae\b|dubai|emirates/i, 'dubtravel', TRAVEL_WORD],
    [/hawaii/i, 'hawtravel', TRAVEL_WORD],
    [/japan/i, 'japtravel', TRAVEL_WORD],
    [/united kingdom|\bthe uk\b|\blondon\b/i, 'lontravel', TRAVEL_WORD],
    [/mexico/i, 'mextravel', TRAVEL_WORD],
    [/south africa/i, 'soutravel', TRAVEL_WORD],
    [/switzerland/i, 'switravel', TRAVEL_WORD],
    [/in the air|(hours?|days?) (of |spent )?(travel|flying)|(travel|flying) for .*(hours?|days?)/i, 'traveltime'],
    [/import.*abroad|bought abroad/i, 'itemsboughtabroad'],
    [/\btravel|\bfly\b|flights?\b|trips? abroad/i, 'traveltimes'],
    // ---- Drugs & items ----
    [/xanax/i, 'xantaken'],
    [/cannabis|marijuana/i, 'cantaken'],
    [/ecstasy/i, 'exttaken'],
    [/ketamine/i, 'kettaken'],
    [/\blsd\b/i, 'lsdtaken'],
    [/opium/i, 'opitaken'],
    [/\bpcp\b/i, 'pcptaken'],
    [/shroom/i, 'shrtaken'],
    [/\bspeed\b/i, 'spetaken', /take|taken|use|consume|dose/i],
    [/vicodin/i, 'victaken'],
    [/overdose on/i, null],
    [/overdos/i, 'overdosed'],
    [/\bdrugs?\b/i, 'drugsused'],
    [/energy drinks?|cans? of/i, 'energydrinkused'],
    [/candy|candies|sweets/i, 'candyused'],
    [/alcohol|beers?\b|bottles? of/i, 'alcoholused'],
    [/stat enhancer/i, 'statenhancersused'],
    [/booster/i, 'boostersused'],
    [/\bbooks?\b/i, 'booksread'],
    // ---- Missions, bounties, racing ----
    [/mission credits?/i, 'missioncreditsearned'],
    [/\bcontracts?\b/i, 'contractscompleted'],
    [/mission/i, 'missionscompleted'],
    [/bount.*(\$|earn|reward|money)|(\$|earn|reward|money).*bount/i, 'totalbountyreward'],
    [/bount/i, 'bountiescollected'],
    [/racing points?/i, 'racingpointsearned'],
    [/racing skill/i, 'racingskill'],
    [/\b(win|won)\b.*\braces?\b|races? won/i, 'raceswon'],
    [/\braces?\b/i, 'racesentered'],
    // ---- Finds, trading ----
    [/(find|found).*(dump|bin|trash)|(dump|bin|trash).*(find|found)/i, 'dumpfinds'],
    [/\b(dump|trash)/i, 'itemsdumped'],
    [/(find|found).*city|city.*(find|found)/i, 'cityfinds'],
    [/auctions?/i, 'auctionswon'],
    [/bazaar/i, 'bazaarcustomers'],
    [/sell .*points|points sold/i, 'pointssold'],
    [/stock payouts?|dividend/i, 'stockpayouts'],
    [/job points?/i, 'jobpointsused'],
    // ---- Refills, activity, commitment ----
    [/nerve refill|refill.*nerve/i, 'nerverefills'],
    [/token refill|refill.*tokens?/i, 'tokenrefills'],
    [/refill/i, 'refills'],
    [/hours? of activity|activity on torn/i, 'useractivity'],
    [/activity streak|consecutive days|online every day for/i, 'bestactivestreak'],
    [/donator/i, 'daysbeendonator'],
    [/net ?worth/i, 'networth'],
    [/\blevel\b/i, '__level'],
    [/faction/i, '__factiondays', /day|week|month|year/i],
    [/married|marriage|spouse/i, '__married'],
    [/days? old|years? old|account age|\baged?\b|(live|lived|been|played|playing)\b.*\btorn\b.*\b(days?|weeks?|months?|years?)\b|torn for \d/i, '__age'],
    [/jailed|(sent|go(ne)?) to jail|in jail/i, 'jailed'],
    [/hospitali[sz]ed|(sent|go(ne)?) to (the )?hospital/i, 'hospital'],
    [/\bcrimes?\b/i, null],
  ];

  // Unit each time-based stat is shown in, so "1 year" or "48 hours" convert properly.
  /* Drug cooldowns in minutes [shortest, longest], from the Torn wiki Drug page.
     Overdosing (Ketamine, LSD, PCP, Xanax) can push the cooldown far higher. */
  const DRUG_CD = {
    cantaken: [60, 90], exttaken: [200, 230], kettaken: [45, 60], lsdtaken: [400, 450], opitaken: [120, 180],
    pcptaken: [260, 400], shrtaken: [182, 237], spetaken: [250, 352], victaken: [240, 360], xantaken: [360, 480],
  };
  const DRUG_OD = { cantaken: 'very rare', opitaken: 'none', exttaken: 'relatively high' };
  const fmtMins = (m) => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`; };

  // Cooldown range for a drug stat, after any reduction set in Settings, and how many fit in a day.
  function drugInfo(stat) {
    const d = DRUG_CD[stat];
    if (!d) return null;
    const red = 1 - Math.min(90, Math.max(0, Number(loadSettings().drugCdReduction) || 0)) / 100;
    const lo = d[0] * red, hi = d[1] * red;
    return { lo, hi, maxDay: Math.floor(1440 / lo), minDay: Math.max(1, Math.floor(1440 / hi)) };
  }
  const daysRange = (rem, di) => { const a = Math.ceil(rem / di.maxDay), b = Math.ceil(rem / di.minDay); return a === b ? humanDays(a) : `${humanDays(a)} – ${humanDays(b)}`; };

  const STAT_UNIT = { useractivity: 'minute', bestkillstreak: null, traveltime: 'hour', __age: 'day', __factiondays: 'day', __married: 'day', daysbeendonator: 'day', bestactivestreak: 'day' };
  const UNIT_MIN = { minute: 1, hour: 60, day: 1440, week: 10080, month: 43200, year: 525600 };

  function parseThreshold(desc, stat) {
    const text = desc.replace(/,(?=\d{3})/g, '');
    const m = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(k|m|b|thousand|million|billion|trillion)?\b\s*(minutes?|hours?|days?|weeks?|months?|years?)?/i);
    if (!m) return /\b(a|an|your first|once)\b/i.test(desc) ? 1 : null;
    let n = parseFloat(m[1]);
    const mult = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9, trillion: 1e12 }[(m[2] || '').toLowerCase()];
    if (mult) n *= mult;
    const unit = STAT_UNIT[stat];
    const said = (m[3] || '').toLowerCase().replace(/s$/, '');
    if (unit && said && UNIT_MIN[said]) n = (n * UNIT_MIN[said]) / UNIT_MIN[unit];
    return n;
  }

  // Why an award can't be followed from a stat, for grouping the "Other awards" list.
  function untrackedReason(desc) {
    if (/login on|purchased from|token shop|points building|competition|community event|easter egg|endurance challenge|rollback|forgiven|dog tag|newspaper|halloween basket/i.test(desc)) return 'Events, logins & specials';
    if (/casino|poker|roulette|slot|lotter|jackpot|blackjack|high-low|wheel of/i.test(desc)) return 'Casino';
    if (/achieve [\d,]+ .*crimes/i.test(desc)) return 'Old crime types the API doesn\'t count';
    if (/skill level of|search for cash|bootlegging|shoplifting|graffiti|skimm|card details|burgl|pickpocket|hustling|disposal|cracking|forgery|scamming|arson|rotten|dvd|beach|dead body|temptation|password|rig at|building in under/i.test(desc)) return 'Crimes 2.0 skills & feats';
    if (/\bclass(es)?\b|\bcourses?\b|\bgym\b|membership|racing class|\brank\b|skill in hunting/i.test(desc)) return 'Education, gym, hunting & racing class';
    if (/stock|bank|invest|church|donat|credit score|airstrip|yacht/i.test(desc)) return 'Money & property';
    if (/prank|souvenir|display case|chronicle|neumune|lease|trout|weapon mods|\bmods?\b/i.test(desc)) return 'Items & misc one-offs';
    return 'One-offs & special conditions';
  }

  function matchAward(desc) {
    for (const [re, stat, needs] of AWARD_RULES) {
      if (re.test(desc) && (!needs || needs.test(desc))) {
        if (!stat) return null;
        const threshold = parseThreshold(desc, stat);
        return threshold ? { stat, threshold } : null;
      }
    }
    return null;
  }
  const STAT_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s]));

  const DEFAULT_GOALS = [
    { stat: 'peoplebusted', daily: 5, lifetime: null },
    { stat: 'bloodwithdrawn', daily: 10, lifetime: null },
  ];

  const DEFAULT_SETTINGS = {
    refreshSec: 60,         // seconds between timed refreshes (shared by all tabs)
    notify: false,          // remind before the Torn day ends
    notifyHours: 3,         // hours before 00:00 TCT
    side: 'right',
    button: 'sidebar',      // 'sidebar' = row under Merits, 'floating' = round button
    sidebarGoals: true,     // list goals under the sidebar row
    historyDays: 60,
    drugCdReduction: 0,     // % shorter drug cooldowns (perks), used for estimates
  };

  const API_ROOT = 'https://api.torn.com/';
  // Torn PDA (mobile app) support. PDA swaps the placeholder below for the key you set up in PDA.
  const IS_PDA = (() => { try { return typeof window.flutter_inappwebview !== 'undefined' || /tornpda/i.test(navigator.userAgent || ''); } catch (e) { return false; } })();
  const PDA_KEY = '###PDA-APIKEY###';
  const pdaKey = () => (IS_PDA && PDA_KEY && PDA_KEY.indexOf('#') === -1 ? PDA_KEY : '');
  // Your own saved key wins; otherwise use the one Torn PDA provides.
  const getKey = () => store.get('mh_key', '') || pdaKey();
  // Phones and Torn PDA hide Torn's sidebar behind a menu, so they also get the floating button.
  const isSmallScreen = () => { try { return IS_PDA || window.innerWidth < 785; } catch (e) { return false; } };
  // Opens Torn's own "new API key" page pre-filled for a Limited key (only when you click it).
  const KEY_LINK = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=Medal%20Detector&type=3';
  const DAY_MS = 86400000;

  /* ------------------------------------------------------------------ */
  /*  Storage                                                            */
  /* ------------------------------------------------------------------ */
  const store = {
    get: (k, d) => { try { const v = GM_getValue(k); return v === undefined ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { GM_setValue(k, v); } catch (e) { /* ignore */ } },
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  function loadGoals() {
    let g = store.get('mh_goals', null);
    if (!Array.isArray(g)) {
      g = DEFAULT_GOALS.map((x) => ({ id: uid(), on: true, ...x }));
      store.set('mh_goals', g);
    }
    return g;
  }
  const saveGoals = (g) => store.set('mh_goals', g);
  const loadSettings = () => Object.assign({}, DEFAULT_SETTINGS, store.get('mh_settings', {}));
  const saveSettings = (s) => store.set('mh_settings', s);
  const loadState = () => Object.assign({ lastFetch: 0, current: {}, days: {}, error: '', notified: {}, awards: null, catError: '' }, store.get('mh_state', {}));
  const saveState = (s) => store.set('mh_state', s);

  /* ------------------------------------------------------------------ */
  /*  Time helpers (TCT = UTC)                                           */
  /* ------------------------------------------------------------------ */
  const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
  const dayStart = (t) => Math.floor(t / DAY_MS) * DAY_MS;
  const fmt = (n) => (n == null || isNaN(n) ? '–' : Math.round(n).toLocaleString('en-GB'));
  const fmtLeft = (ms) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  };
  const statLabel = (key) => (STAT_BY_KEY[key] ? STAT_BY_KEY[key].label : key);
  const goalLabel = (g) => (g.award ? g.award.name : statLabel(g.stat));
  const statDiv = (key) => (STAT_BY_KEY[key] ? STAT_BY_KEY[key].div : 1);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------ */
  /*  API (api.torn.com only)                                            */
  /* ------------------------------------------------------------------ */
  function apiGet(params, section = 'user') {
    const key = getKey();
    if (!key) return Promise.reject(new Error('No API key set'));
    const qs = new URLSearchParams({ ...params, key, comment: 'MedalDetector' }).toString();
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${API_ROOT}${section}/?${qs}`,
        timeout: 15000,
        onload: (r) => {
          try {
            const d = JSON.parse(r.responseText);
            if (d.error) {
              const msg = { 2: 'That API key is incorrect. Check it in Settings.', 16: "Your key's access level is too low. Medal Detector needs a Limited key.", 13: 'That key is paused or inactive.', 10: 'That key belongs to a player in federal jail.' }[d.error.code];
              reject(new Error(msg || `API error ${d.error.code}: ${d.error.error}`));
            }
            else resolve(d);
          } catch (e) { reject(new Error('Bad API response')); }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('API timed out')),
      });
    });
  }

  // Accepts both id lists ([1, 2]) and object lists ([{id: 1}, ...]).
  const idList = (v) => (Array.isArray(v) ? v.map((x) => Number(x && typeof x === 'object' ? x.id : x)).filter((n) => !isNaN(n)) : []);

  // Everything the script needs from your account, in ONE call (needs a Limited key).
  const USER_SELECTIONS = 'personalstats,profile,honors,medals,battlestats,workstats,education,perks';

  async function fetchCurrent() {
    const d = await apiGet({ selections: USER_SELECTIONS });
    const stats = Object.assign({}, d.personalstats || {});
    const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(+v.replace(/,/g, '')) ? +v.replace(/,/g, '') : undefined);
    const set = (k, v) => { const n = num(v); if (n !== undefined) stats[k] = n; };
    // profile
    set('__level', d.level);
    set('__age', d.age);
    if (d.faction && d.faction.faction_id) set('__factiondays', d.faction.days_in_faction);
    if (d.married && d.married.spouse_id) set('__married', d.married.duration);
    // battle stats, working stats, education, perks
    set('__str', d.strength); set('__def', d.defense); set('__spd', d.speed); set('__dex', d.dexterity);
    set('__manual', d.manual_labor); set('__intel', d.intelligence); set('__endu', d.endurance);
    if (Array.isArray(d.education_completed)) stats.__edu = d.education_completed.length;
    if (['__str', '__def', '__spd', '__dex'].every((k) => typeof stats[k] === 'number')) stats.__total = stats.__str + stats.__def + stats.__spd + stats.__dex;
    const work = ['__manual', '__intel', '__endu'].filter((k) => typeof stats[k] === 'number');
    if (work.length) stats.__workmax = Math.max(...work.map((k) => stats[k]));
    const perkLists = Object.keys(d).filter((k) => /_perks$/.test(k) && Array.isArray(d[k]));
    if (perkLists.length) stats.__perks = perkLists.reduce((t, k) => t + d[k].length, 0);
    // awards you own
    const hasAwards = 'honors_awarded' in d || 'medals_awarded' in d || Array.isArray(d.honors) || Array.isArray(d.medals);
    const awards = hasAwards ? { honors: idList(d.honors_awarded || d.honors), medals: idList(d.medals_awarded || d.medals) } : null;
    if (awards) stats.__awards = awards.honors.length + awards.medals.length;
    // derived
    const WEAPON_HITS = ['axehits', 'chahits', 'grehits', 'h2hhits', 'heahits', 'machits', 'piehits', 'pishits', 'rifhits', 'shohits', 'slahits', 'smghits'];
    if (WEAPON_HITS.every((k) => typeof stats[k] === 'number')) stats.__warmachine = Math.min(...WEAPON_HITS.map((k) => stats[k]));
    if (typeof stats.attackswon === 'number' && typeof stats.defendswon === 'number') stats.__007 = Math.min(stats.attackswon, stats.defendswon);
    return { stats, awards };
  }

  // Full honour + medal list (names and descriptions), cached for a day.
  function normCatalogue(obj) {
    if (!obj) return [];
    const arr = Array.isArray(obj) ? obj : Object.entries(obj).map(([id, v]) => Object.assign({ id }, v));
    return arr.map((a) => ({
      id: Number(a.id),
      name: String(a.name || ''),
      desc: String(a.description || ''),
      type: a.type && typeof a.type === 'object' ? String(a.type.name || '') : String(a.type == null ? '' : a.type),
      circulation: typeof a.circulation === 'number' ? a.circulation : null,
    })).filter((a) => !isNaN(a.id) && a.desc);
  }

  async function ensureCatalogue(force) {
    const cat = store.get('mh_awards_cat', null);
    if (!force && cat && Date.now() - cat.fetched < DAY_MS && cat.honors.length + cat.medals.length > 0) return cat;
    const d = await apiGet({ selections: 'honors,medals' }, 'torn');
    const fresh = { fetched: Date.now(), honors: normCatalogue(d.honors), medals: normCatalogue(d.medals) };
    store.set('mh_awards_cat', fresh);
    return fresh;
  }

  // Historical stats at a timestamp, in chunks of 10 stat names (personal stats only).
  async function fetchAt(ts, keys) {
    keys = keys.filter((k) => !isVirtual(k));
    const out = {};
    for (let i = 0; i < keys.length; i += 10) {
      const chunk = keys.slice(i, i + 10);
      const d = await apiGet({ selections: 'personalstats', stat: chunk.join(','), timestamp: String(Math.floor(ts / 1000)) });
      const ps = d.personalstats || {};
      for (const k of chunk) if (typeof ps[k] === 'number') out[k] = ps[k];
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Refresh + day rollover                                             */
  /* ------------------------------------------------------------------ */
  let refreshing = false;

  // Older versions stored minutes; use that if the user set it before.
  const refreshEveryMs = (st) => (st.refreshSec ? st.refreshSec : (st.refreshMin || 1) * 60) * 1000;
  // Never check more often than this, whatever triggers it (keeps well inside Torn's API limits).
  const MIN_GAP_MS = 15000;
  let soonTimer = null;

  // Check again shortly: after you do something in Torn, or come back to the tab.
  // This only ever calls api.torn.com.
  function refreshSoon(delayMs = 0) {
    clearTimeout(soonTimer);
    soonTimer = setTimeout(() => {
      const since = Date.now() - loadState().lastFetch;
      if (since >= MIN_GAP_MS) refresh(true);
      else refreshSoon(MIN_GAP_MS - since);
    }, delayMs);
  }

  async function refresh(force) {
    const settings = loadSettings();
    let state = loadState();
    const now = Date.now();
    if (refreshing) return;
    if (!force && now - state.lastFetch < refreshEveryMs(settings)) return;
    if (!getKey()) return;

    refreshing = true;
    // claim the slot first so other tabs don't call at the same time
    state.lastFetch = now;
    saveState(state);
    try {
      const { stats: cur, awards } = await fetchCurrent();
      let catError = '';
      try { await ensureCatalogue(false); } catch (e) { catError = e.message; }
      state = loadState();
      if (awards) { state.awards = awards; state.awardsAt = now; }
      state.catError = catError;
      const today = dayKey(now);
      const goalKeys = [...new Set(loadGoals().map((g) => g.stat).filter(Boolean))];

      if (!state.days[today]) {
        // New Torn day: find the stats as they were at 00:00 TCT.
        // exact = stats whose baseline is the true 00:00 TCT value.
        let hist = {};
        try { hist = await fetchAt(dayStart(now), goalKeys); } catch (e) { hist = {}; }
        const exact = Object.keys(hist);
        const base = Object.assign({}, cur, hist);

        // Finalise yesterday with the true midnight values we got.
        const yKey = dayKey(now - DAY_MS);
        if (state.days[yKey] && exact.length) state.days[yKey].last = Object.assign({}, state.days[yKey].last, hist);

        state.days[today] = { base, last: {}, exact };
      }

      // A stat with no baseline yet (new goal, or a stat missing earlier) counts from now.
      const rec = state.days[today];
      if (!Array.isArray(rec.exact)) rec.exact = [];
      for (const k of goalKeys) {
        if (typeof rec.base[k] !== 'number' && typeof cur[k] === 'number') rec.base[k] = cur[k];
      }
      rec.last = Object.assign({}, cur);
      rec.lastAt = now;
      state.current = cur;
      state.error = '';

      // prune history
      const cutoff = dayKey(now - settings.historyDays * DAY_MS);
      for (const k of Object.keys(state.days)) if (k < cutoff) delete state.days[k];
      saveState(state);
      maybeNotify();
    } catch (e) {
      state = loadState();
      state.error = e.message;
      saveState(state);
    } finally {
      refreshing = false;
      render(true);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Progress maths                                                     */
  /* ------------------------------------------------------------------ */
  const isExact = (rec, stat) => Array.isArray(rec.exact) && rec.exact.includes(stat);

  function doneOn(state, day, stat) {
    const r = state.days[day];
    if (!r || typeof r.base[stat] !== 'number' || typeof r.last[stat] !== 'number') return null;
    return Math.max(0, (r.last[stat] - r.base[stat]) / statDiv(stat));
  }

  function streak(state, goal) {
    if (!goal.daily) return 0;
    const now = Date.now();
    let n = 0;
    const todayDone = doneOn(state, dayKey(now), goal.stat);
    if (todayDone != null && todayDone >= goal.daily) n++;
    for (let i = 1; i < 400; i++) {
      const d = doneOn(state, dayKey(now - i * DAY_MS), goal.stat);
      if (d == null || d < goal.daily) break;
      n++;
    }
    return n;
  }

  function avgDaily(state, stat, days = 7) {
    const now = Date.now();
    const vals = [];
    for (let i = 1; i <= days; i++) {
      const d = doneOn(state, dayKey(now - i * DAY_MS), stat);
      if (d != null) vals.push(d);
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  /* ------------------------------------------------------------------ */
  /*  Merit milestones (your honours + medals vs. the full award list)   */
  /* ------------------------------------------------------------------ */
  const statValue = (state, stat) => (typeof state.current[stat] === 'number' ? state.current[stat] / statDiv(stat) : null);

  function getMilestones(state) {
    const cat = store.get('mh_awards_cat', null);
    if (!cat) return null;
    const known = !!state.awards;
    const owned = {
      honors: new Set(known ? state.awards.honors : []),
      medals: new Set(known ? state.awards.medals : []),
    };
    const byStat = {};
    const untracked = [];
    const all = [];
    const byId = {};
    const totals = { honors: [0, 0], medals: [0, 0] };
    for (const kind of ['medals', 'honors']) {
      for (const a of cat[kind] || []) {
        const earned = owned[kind].has(a.id);
        totals[kind][1]++;
        if (earned) totals[kind][0]++;
        const item = Object.assign({}, a, { kind, earned, key: `${kind}:${a.id}` });
        all.push(item);
        byId[item.key] = item;
        const m = matchAward(a.desc);
        if (!m) { item.category = untrackedReason(a.desc); untracked.push(item); continue; }
        item.threshold = m.threshold;
        item.stat = m.stat;
        item.category = STAT_BY_KEY[m.stat] ? STAT_BY_KEY[m.stat].group : 'Other';
        (byStat[m.stat] = byStat[m.stat] || []).push(item);
      }
    }
    const stats = {};
    for (const [stat, list] of Object.entries(byStat)) {
      list.sort((a, b) => a.threshold - b.threshold || (a.kind < b.kind ? -1 : 1));
      const value = statValue(state, stat);
      const next = list.find((a) => !a.earned) || null;
      const top = list[list.length - 1]; // highest award available for this stat
      stats[stat] = {
        stat, list, value, next, top,
        topPct: value != null ? Math.min(100, (value / top.threshold) * 100) : 0,
        earned: list.filter((a) => a.earned).length,
        pct: next && value != null ? Math.min(100, (value / next.threshold) * 100) : next ? 0 : 100,
        tracked: value != null,
      };
    }
    // progress for each stat-backed award
    for (const it of all) {
      if (!it.stat) continue;
      const v = stats[it.stat] ? stats[it.stat].value : null;
      it.value = v;
      it.pct = v == null ? 0 : Math.min(100, (v / it.threshold) * 100);
      it.remaining = v == null ? null : Math.max(0, it.threshold - v);
    }
    return { stats, untracked, all, byId, totals, known, fetched: cat.fetched };
  }

  function goalView(state, goal, ms) {
    const today = dayKey(Date.now());
    const done = doneOn(state, today, goal.stat);
    const total = statValue(state, goal.stat);
    const daily = goal.daily || 0;
    const v = {
      goal, done, total,
      pct: done == null || !daily ? 0 : Math.min(100, (done / daily) * 100),
      met: daily > 0 && done != null && done >= daily,
      streak: streak(state, goal),
    };
    let lifetime = goal.lifetime;
    if (goal.award) {
      // A goal for one specific honour or medal
      const a = ms && ms.byId[`${goal.award.kind}:${goal.award.id}`];
      v.award = a || null;
      v.awardEarned = !!(a && a.earned);
      v.allEarned = v.awardEarned;
      if (a && a.stat) lifetime = v.awardEarned ? null : a.threshold;
      v.checklist = !goal.stat;
    } else if (goal.auto) {
      const info = ms && ms.stats[goal.stat];
      v.nextAward = info ? info.next : null;
      v.topAward = info ? info.top : null;
      v.allEarned = !!(info && !info.next);
      // Lifetime target = the highest award available for this stat.
      lifetime = v.topAward && !v.allEarned ? v.topAward.threshold : null;
    }
    v.lifetime = lifetime;
    if (lifetime && total != null) {
      v.remaining = Math.max(0, lifetime - total);
      const avg = avgDaily(state, goal.stat);
      const rate = avg || daily;
      v.eta = v.remaining <= 0 ? 0 : rate ? Math.ceil(v.remaining / rate) : null;
      v.etaFromAvg = !!avg;
      v.lifePct = Math.min(100, (total / lifetime) * 100);
    }
    return v;
  }

  /* ------------------------------------------------------------------ */
  /*  Notifications (optional)                                           */
  /* ------------------------------------------------------------------ */
  function maybeNotify() {
    if (IS_PDA) return; // Torn PDA turns notifications into a pop-up box, so reminders are off there
    const s = loadSettings();
    if (!s.notify) return;
    const now = Date.now();
    const left = dayStart(now) + DAY_MS - now;
    if (left > s.notifyHours * 3600000) return;
    const state = loadState();
    const today = dayKey(now);
    if (state.notified[today]) return;
    const open = loadGoals().filter((g) => g.on && g.daily > 0).map((g) => goalView(state, g)).filter((v) => !v.met);
    if (!open.length) return;
    state.notified = { [today]: true };
    saveState(state);
    try {
      GM_notification({
        title: 'Medal Detector',
        text: `${fmtLeft(left)} left today. Unfinished: ${open.map((v) => `${goalLabel(v.goal)} ${fmt(v.done)}/${fmt(v.goal.daily)}`).join(', ')}`,
        timeout: 15000,
      });
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /*  UI (Shadow DOM so Torn's CSS can't leak in)                        */
  /* ------------------------------------------------------------------ */
  let host, root, open = false, tab = 'overview';

  /* ---------- Icons: 16px line icons drawn in the current text colour ---------- */
  const P = {
    overview: '<path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z"/>',
    honours: '<rect x="1.5" y="5" width="13" height="6" rx="1"/><path d="M5 5v6M8 5v6M11 5v6"/>',
    medals: '<circle cx="8" cy="10.2" r="3.6"/><path d="M5.3 1.8L8 6.6l2.7-4.8"/>',
    goals: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.6"/>',
    history: '<path d="M2 13.5h12M4 11V8.5M7 11V5M10 11V7M13 11V3.5"/>',
    settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
    refresh: '<path d="M13.2 8.5A5.2 5.2 0 1 1 11.6 4.3M13.2 2.5v3.2H10"/>',
    close: '<path d="M4 4l8 8M12 4l-8 8"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4L14 14"/>',
    check: '<path d="M3.5 8.4l3 3 6-6.8"/>',
    plus: '<path d="M8 3.2v9.6M3.2 8h9.6"/>',
    trash: '<path d="M3 4.5h10M6.4 4.5V3h3.2v1.5M4.4 4.5l.7 8.5h5.8l.7-8.5"/>',
    back: '<path d="M10 3.2L5.2 8l4.8 4.8"/>',
    flame: '<path d="M8 14.2c-2.6 0-4.2-1.8-4.2-4 0-2.8 2.6-4.2 2.6-7.2 2.1 1.2 3.1 3 3.1 4.6.5-.5.9-1.3.9-2.1 1.3 1 1.8 2.7 1.8 4.7 0 2.2-1.6 4-4.2 4z"/>',
    jail: '<path d="M3 2.5h10v11H3zM6.3 2.5v11M9.7 2.5v11"/>',
    hospital: '<path d="M6.4 2.5h3.2v3.9h3.9v3.2H9.6v3.9H6.4V9.6H2.5V6.4h3.9z"/>',
    attack: '<circle cx="8" cy="8" r="5"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/>',
    weapon: '<path d="M2.5 13.5l7.2-7.2M7.8 3.4l4.8 4.8M10.6 1.8l3.6 3.6-1.6 1.6-3.6-3.6z"/>',
    travel: '<path d="M1.8 9.2L14.2 4.4l-3.6 9.2-2.6-3.6z"/>',
    items: '<path d="M2.5 4.8L8 2.3l5.5 2.5v6.4L8 13.7l-5.5-2.5zM2.5 4.8L8 7.3l5.5-2.5M8 7.3v6.4"/>',
    drugs: '<path d="M5.4 13.4a3 3 0 0 1-4.2-4.2l5.3-5.3a3 3 0 0 1 4.2 4.2zM4.2 6.2l4.2 4.2"/>',
    crimes: '<path d="M1.8 6.2c2.4-1.7 10-1.7 12.4 0v1.4c-1 2.1-3.2 2.5-4.3 1L8 7.6 6.1 8.6C5 10.1 2.8 9.7 1.8 7.6z"/>',
    missions: '<path d="M4 2.5v11M4 3h8l-1.6 2.6L12 8.2H4"/>',
    racing: '<path d="M3.5 13.8V2.5M3.5 3h9v6h-9M6.5 3v6M9.5 3v6M3.5 6h9"/>',
    trading: '<path d="M2.3 8.6l6.3-6.3h5.1v5.1l-6.3 6.3z"/><circle cx="10.6" cy="5.4" r="1"/>',
    gym: '<path d="M1.5 8h13M3.5 5.4v5.2M5.6 4.2v7.6M10.4 4.2v7.6M12.5 5.4v5.2"/>',
    profile: '<circle cx="8" cy="5.4" r="2.6"/><path d="M2.9 13.6c.7-2.8 2.8-4.1 5.1-4.1s4.4 1.3 5.1 4.1"/>',
    other: '<path d="M8 2l1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1-3-2.9 4.1-.5z"/>',
    calendar: '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4"/>',
    dice: '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><circle cx="5.7" cy="5.7" r=".6"/><circle cx="10.3" cy="10.3" r=".6"/><circle cx="8" cy="8" r=".6"/>',
    cap: '<path d="M1.5 6.5L8 3.5l6.5 3L8 9.5zM4.2 7.8v3c1 1 2.4 1.5 3.8 1.5s2.8-.5 3.8-1.5v-3"/>',
    coin: '<circle cx="8" cy="8" r="6"/><path d="M9.8 5.8C9.4 5.3 8.8 5 8 5c-1.1 0-1.9.6-1.9 1.4 0 1.9 3.8 1.1 3.8 3.1 0 .8-.8 1.5-1.9 1.5-.9 0-1.6-.4-2-1M8 3.8V5M8 11v1.2"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 16 16" aria-hidden="true">${P[n] || P.other}</svg>`;
  const GROUP_ICON = {
    Jail: 'jail', Hospital: 'hospital', Attacking: 'attack', 'Finishing hits': 'weapon', Travel: 'travel', Items: 'items', Drugs: 'drugs',
    'Crimes & finds': 'crimes', 'Missions & bounties': 'missions', Racing: 'racing', Trading: 'trading', 'Gym & work': 'gym', Profile: 'profile', Other: 'other',
    'Events, logins & specials': 'calendar', Casino: 'dice', "Old crime types the API doesn't count": 'crimes', 'Crimes 2.0 skills & feats': 'crimes',
    'Education, gym, hunting & racing class': 'cap', 'Money & property': 'coin', 'Items & misc one-offs': 'items', 'One-offs & special conditions': 'attack',
  };
  const statGroup = (stat) => (STAT_BY_KEY[stat] ? STAT_BY_KEY[stat].group : 'Other');
  const statIcon = (stat) => icon(GROUP_ICON[statGroup(stat)] || 'other');
  const catIcon = (cat) => icon(GROUP_ICON[cat] || 'other');
  const goalIcon = (g, ms) => {
    if (g.stat) return statIcon(g.stat);
    const a = g.award && ms && ms.byId[`${g.award.kind}:${g.award.id}`];
    return a ? catIcon(a.category) : icon(g.award && g.award.kind === 'medals' ? 'medals' : 'honours');
  };
  const kindName = (k) => (k === 'medals' ? 'Medal' : 'Honour');
  const plural = (n, w) => `${fmt(n)} ${w}${Math.round(n) === 1 ? '' : 's'}`;
  const humanDays = (d) => (d < 60 ? plural(d, 'day') : d < 730 ? plural(Math.round(d / 30.4), 'month') : `${(d / 365).toFixed(1)} years`);

  /* ---------------------------------- Styles ---------------------------------- */
  const CSS = `
  :host{all:initial}
  *,*::before,*::after{box-sizing:border-box}
  .mh{--bg:#1b1e24;--surface:#22262d;--raised:#2a2f37;--line:#343a44;--soft:#2b3038;--text:#e6e8eb;--muted:#8d95a3;--faint:#636a76;
    --brass:#c8a24c;--brass-hi:#dcb867;--brass-bg:rgba(200,162,76,.12);--done:#7cbf5a;--done-bg:rgba(124,191,90,.12);--bad:#d4646b;--bad-bg:rgba(212,100,107,.12);--blue:#7d97d6;
    font-family:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.45;color:var(--text);
    -webkit-font-smoothing:antialiased}
  .ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}
  button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
  :focus-visible{outline:2px solid var(--brass);outline-offset:2px;border-radius:4px}
  .num{font-variant-numeric:tabular-nums}

  /* floating button (only when chosen, or no sidebar) */
  .fab{position:fixed;bottom:84px;z-index:999998;width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--line);color:var(--brass);
    display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.45)}
  .fab .ic{width:20px;height:20px}
  .fab .badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--brass);color:#1b1e24;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
  .fab .badge.ok{background:var(--done)}

  /* window */
  .backdrop{position:fixed;inset:0;z-index:999999;background:rgba(8,10,13,.66);display:flex;align-items:center;justify-content:center;padding:20px}
  .modal{width:min(1040px,100%);height:min(720px,100%);background:var(--bg);border:1px solid var(--line);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.6);
    display:grid;grid-template-columns:200px 1fr;grid-template-rows:auto 1fr;overflow:hidden;animation:enter .16s ease-out}
  @keyframes enter{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
  .top{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px 16px 12px 18px;border-bottom:1px solid var(--line);background:var(--surface)}
  .brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
  .mark{width:28px;height:28px;border-radius:7px;background:var(--brass-bg);color:var(--brass);display:flex;align-items:center;justify-content:center;flex:none}
  .brand h1{margin:0;font-size:15px;font-weight:650;letter-spacing:.1px}
  .brand p{margin:0;color:var(--muted);font-size:12px}
  .tool{width:32px;height:32px;border-radius:8px;color:var(--muted);display:flex;align-items:center;justify-content:center}
  .tool:hover{background:var(--raised);color:var(--text)}
  .tool.spin .ic{animation:spin .9s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .updated{color:var(--faint);font-size:12px;white-space:nowrap}

  .nav{border-right:1px solid var(--line);background:var(--surface);padding:10px 8px;display:flex;flex-direction:column;gap:1px;min-height:0;overflow:auto}
  .nav button{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:7px;color:var(--muted);font-size:13px;text-align:left}
  .nav button:hover{background:var(--raised);color:var(--text)}
  .nav button[aria-current="page"]{background:var(--raised);color:var(--text);font-weight:600;box-shadow:inset 2px 0 0 var(--brass)}
  .nav button[aria-current="page"] .ic{color:var(--brass)}
  .nav .count{margin-left:auto;font-size:11.5px;color:var(--faint);font-variant-numeric:tabular-nums}
  .nav .foot{margin-top:auto;padding:10px;color:var(--faint);font-size:11.5px;line-height:1.4}
  .main{overflow:auto;min-height:0;padding:22px 26px 28px}

  /* page header */
  .ph{display:flex;align-items:flex-end;gap:16px;margin-bottom:18px}
  .ph > div{flex:1;min-width:0}
  .ph h2{margin:0;font-size:20px;font-weight:650;letter-spacing:-.1px}
  .ph p{margin:4px 0 0;color:var(--muted);max-width:62ch}
  h3{display:flex;align-items:baseline;gap:8px;margin:24px 0 8px;font-size:13.5px;font-weight:650;color:var(--text)}
  h3 .n{color:var(--faint);font-weight:500;font-variant-numeric:tabular-nums}
  h3 .ic{color:var(--muted);align-self:center}

  /* scoreboard */
  .board{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden}
  .fig{padding:14px 16px 12px;border-left:1px solid var(--soft);min-width:0}
  .fig:first-child{border-left:0}
  .fig-n{font-size:26px;font-weight:650;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.4px}
  .fig-n small{font-size:14px;color:var(--faint);font-weight:500;letter-spacing:0}
  .fig-l{display:block;color:var(--muted);font-size:12px;margin-top:4px}
  .fig-rule{height:3px;border-radius:2px;background:var(--soft);margin-top:10px;overflow:hidden}
  .fig-rule i{display:block;height:100%;background:var(--brass)}
  .fig.ok .fig-rule i{background:var(--done)}

  /* ledger list */
  .list{border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden}
  .item{display:grid;grid-template-columns:1fr auto;align-items:center;border-top:1px solid var(--soft)}
  .list > .item:first-child{border-top:0}
  .row{display:grid;grid-template-columns:22px minmax(0,1fr) minmax(150px,220px);align-items:center;gap:12px;padding:10px 14px;text-align:left;width:100%;min-height:52px}
  button.row:hover{background:rgba(255,255,255,.025)}
  .t{min-width:0}
  .t b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .t span{display:block;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item.open .t span{white-space:normal}
  .st{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--faint);display:flex;align-items:center;justify-content:center;color:var(--muted)}
  .st .ic{width:14px;height:14px}
  .st.part{border-color:var(--brass);background:conic-gradient(var(--brass) calc(var(--p)*1%),transparent 0);border-width:0;position:relative}
  .st.part::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--surface)}
  .st.done{border-color:var(--done);background:var(--done);color:#16210f}
  .st.icon{border:0;border-radius:6px;background:var(--raised);width:22px;height:22px}
  .prog{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:0}
  .prog .v{font-size:12.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
  .prog .v small{color:var(--faint);font-size:12px}
  .line{width:100%;height:4px;border-radius:2px;background:var(--soft);overflow:hidden}
  .line i{display:block;height:100%;background:var(--brass);border-radius:2px}
  .line.done i{background:var(--done)}
  .line.blue i{background:var(--blue)}
  .meta{color:var(--muted);font-size:12px;white-space:nowrap}
  .meta.done{color:var(--done)}
  .act{padding-right:12px;display:flex;align-items:center;gap:8px}
  .pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:12px;font-size:12px;color:var(--muted);background:var(--raised);white-space:nowrap}
  .pill.brass{color:var(--brass-hi);background:var(--brass-bg)}
  .pill.done{color:var(--done);background:var(--done-bg)}
  .pill .ic{width:13px;height:13px}
  .expand{grid-column:1/-1;padding:2px 14px 16px 48px;color:var(--text)}
  .group-h{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--bg);border-top:1px solid var(--soft);color:var(--muted);font-size:12.5px;font-weight:600}
  .list > .group-h:first-child{border-top:0}
  .group-h .n{color:var(--faint);font-weight:500}

  /* buttons and fields */
  .btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 13px;border-radius:7px;font-weight:600;font-size:13px;white-space:nowrap}
  .btn.primary{background:var(--brass);color:#1b1e24}
  .btn.primary:hover{background:var(--brass-hi)}
  .btn.secondary{background:var(--raised);color:var(--text);border:1px solid var(--line)}
  .btn.secondary:hover{border-color:var(--faint)}
  .btn.quiet{color:var(--brass-hi);height:28px;padding:0 9px}
  .btn.quiet:hover{background:var(--brass-bg)}
  .btn.danger{color:var(--muted);width:30px;padding:0;height:30px}
  .btn.danger:hover{color:var(--bad);background:var(--bad-bg)}
  .btn[disabled]{opacity:.45;cursor:not-allowed}
  .btn .ic{width:14px;height:14px}
  input,select{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:7px;height:32px;padding:0 10px;width:100%;outline:none}
  input:focus,select:focus{border-color:var(--brass)}
  input[type=number]{font-variant-numeric:tabular-nums}
  input:disabled{color:var(--muted)}
  input[type=checkbox]{width:16px;height:16px;padding:0;accent-color:var(--brass);flex:none}
  .field{position:relative;flex:1;min-width:200px}
  .field .ic{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--faint)}
  .field input{padding-left:32px}
  .check{display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text)}
  .seg{display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:2px;gap:2px;flex-wrap:wrap}
  .seg button{height:26px;padding:0 10px;border-radius:6px;color:var(--muted);font-size:12.5px;white-space:nowrap}
  .seg button:hover{color:var(--text)}
  .seg button[aria-pressed="true"]{background:var(--raised);color:var(--text);font-weight:600}
  .seg .n{color:var(--faint);margin-left:4px;font-variant-numeric:tabular-nums}
  .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}

  /* detail pieces */
  .desc{color:var(--muted);margin:0 0 10px;max-width:70ch}
  .tiers{display:flex;flex-direction:column;border-left:2px solid var(--soft);margin:6px 0 4px 4px}
  .tier{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:5px 0 5px 14px;position:relative}
  .tier::before{content:"";position:absolute;left:-6px;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:var(--bg);border:2px solid var(--faint)}
  .tier.got::before{background:var(--done);border-color:var(--done)}
  .tier.next::before{border-color:var(--brass);background:var(--brass)}
  .tier.here{background:var(--brass-bg);border-radius:0 6px 6px 0;padding-right:8px}
  .tier .nm{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tier .nm small{color:var(--faint);margin-left:6px}
  .tier.got .nm{color:var(--muted)}
  .tier .r{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
  .note{display:flex;gap:8px;margin-top:10px;padding:9px 11px;border-radius:8px;background:var(--raised);color:var(--muted);font-size:12.5px;max-width:72ch}
  .note .ic{margin-top:1px;color:var(--faint)}
  .note b{color:var(--text);font-weight:600}
  .note.warn{color:#e5c98d;background:rgba(200,162,76,.1)}
  .note.err{color:#f0a3a8;background:var(--bad-bg)}
  .note.err .ic,.note.warn .ic{color:currentColor}
  .kv{display:flex;flex-wrap:wrap;gap:6px 22px;margin:2px 0 10px}
  .kv div{color:var(--muted);font-size:12px}
  .kv b{display:block;color:var(--text);font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
  .sugg{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .sugg button{height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--line);color:var(--muted);font-size:12.5px;background:var(--surface)}
  .sugg button:hover{border-color:var(--brass);color:var(--text)}
  .sugg b{color:var(--text);font-weight:600}
  .eta{color:var(--muted);font-size:12.5px;margin-top:8px}
  .eta b{color:var(--text);font-weight:600}
  .eta .bad{color:var(--bad)}

  /* goals */
  .grow{display:grid;grid-template-columns:auto 22px minmax(0,1fr) 90px 150px auto;gap:12px;align-items:center;padding:10px 12px 10px 14px}
  .grow.off{opacity:.5}
  .grow label{display:block;color:var(--faint);font-size:11.5px;margin-bottom:3px}
  .grow .tgt{font-size:12.5px;color:var(--muted);line-height:1.3}
  .grow .tgt b{color:var(--text);font-weight:600}
  .gfoot{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:0 14px 10px 82px;margin-top:-4px}
  .gfoot .meta{font-size:12px}

  /* goal picker */
  .pick{display:grid;grid-template-columns:330px minmax(0,1fr);gap:0;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden;height:calc(100% - 64px);min-height:420px}
  .pl{display:flex;flex-direction:column;border-right:1px solid var(--line);min-height:0}
  .pl-top{padding:12px;display:flex;flex-direction:column;gap:9px;border-bottom:1px solid var(--line)}
  .pl-top .field{min-width:0}
  .pl-top .check{font-size:12.5px;color:var(--muted)}
  .pl-top .seg{display:grid;grid-template-columns:repeat(4,1fr)}
  .pl-top .seg button{padding:0 4px}
  .pl-top .seg .n{display:none}
  .plist{overflow:auto;flex:1;min-height:0}
  .plist .group-h{position:sticky;top:0;z-index:1}
  .pent{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;text-align:left;padding:8px 12px;border-top:1px solid var(--soft)}
  .pent:hover{background:rgba(255,255,255,.03)}
  .pent[aria-selected="true"]{background:var(--brass-bg);box-shadow:inset 2px 0 0 var(--brass)}
  .pent .r{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
  .pent .r.done{color:var(--done)}
  .pd{overflow:auto;padding:20px 22px;min-height:0}
  .pd h4{margin:6px 0 4px;font-size:17px;font-weight:650}
  .pd .lbl{display:block;color:var(--muted);font-size:12px;margin:14px 0 6px}
  .opts{display:flex;flex-direction:column;gap:6px}
  .opt{display:flex;align-items:flex-start;gap:9px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
  .opt:hover{border-color:var(--faint)}
  .opt input{margin-top:2px;accent-color:var(--brass);width:15px;height:15px}
  .opt b{font-weight:600}
  .opt span{display:block;color:var(--muted);font-size:12px}
  .opt input[type=number]{display:block;width:160px;margin-top:6px;height:30px}
  .pd-actions{display:flex;gap:10px;align-items:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--soft)}
  .empty{padding:44px 20px;text-align:center;color:var(--muted)}
  .empty b{display:block;color:var(--text);font-size:15px;margin-bottom:4px}
  .empty .btn{margin-top:14px}

  /* history */
  .hist{padding:12px 14px;border-top:1px solid var(--soft)}
  .list > .hist:first-child{border-top:0}
  .hist-h{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:12px;align-items:center}
  .cells{display:grid;grid-template-columns:repeat(14,1fr);gap:3px;margin:10px 0 4px 34px}
  .cells i{height:18px;border-radius:3px;background:var(--soft);position:relative}
  .cells i.y{background:var(--done)}
  .cells i.n{background:rgba(212,100,107,.5)}
  .cells i.p::after{content:"";position:absolute;right:3px;top:3px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.75)}
  .cells-x{display:flex;justify-content:space-between;margin-left:34px;color:var(--faint);font-size:11px}
  .legend{display:flex;flex-wrap:wrap;gap:14px;color:var(--muted);font-size:12px;margin-bottom:12px}
  .legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--c)}

  /* settings */
  .set{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,300px);gap:16px;align-items:center;padding:13px 16px;border-top:1px solid var(--soft)}
  .list > .set:first-child{border-top:0}
  .set b{display:block;font-weight:600}
  .set span{display:block;color:var(--muted);font-size:12px;margin-top:2px}
  .set.wide{grid-template-columns:1fr}
  .keyrow{display:flex;gap:8px}
  .keymsg{color:var(--muted);font-size:12px;margin-top:6px}
  .keymsg.ok{color:var(--done)}
  .keymsg.bad{color:var(--bad)}
  table.tos{width:100%;border-collapse:collapse;font-size:12.5px}
  table.tos td{padding:9px 16px;border-top:1px solid var(--soft);vertical-align:top}
  table.tos tr:first-child td{border-top:0}
  table.tos td:first-child{color:var(--muted);width:34%}
  a.link{color:var(--brass-hi);text-decoration:none;font-weight:600}
  a.link:hover{text-decoration:underline}

  .toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);z-index:1000000;background:var(--raised);color:var(--text);border:1px solid var(--line);
    padding:9px 14px;border-radius:8px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;display:flex;gap:8px;align-items:center}
  .toast.show{opacity:1;transform:translate(-50%,0)}
  .toast .ic{color:var(--done)}

  @media (prefers-reduced-motion:reduce){.modal{animation:none}.tool.spin .ic{animation:none}.toast{transition:none}}
  @media (max-width:760px){
    .backdrop{padding:0}
    .modal{border-radius:0;height:100%;grid-template-columns:1fr;grid-template-rows:auto auto 1fr}
    .nav{flex-direction:row;border-right:0;border-bottom:1px solid var(--line);padding:6px;overflow-x:auto}
    .nav button{width:auto;flex:none;padding:7px 10px}
    .nav button[aria-current="page"]{box-shadow:inset 0 -2px 0 var(--brass)}
    .nav .count,.nav .foot,.updated{display:none}
    .main{padding:16px}
    .board{grid-template-columns:repeat(2,1fr)}
    .fig:nth-child(3){border-left:0}
    .fig:nth-child(n+3){border-top:1px solid var(--soft)}
    .row{grid-template-columns:22px minmax(0,1fr);}
    .row .prog{grid-column:2;align-items:stretch}
    .prog .v{align-self:flex-start}
    .expand{padding-left:14px}
    .grow{grid-template-columns:auto 22px minmax(0,1fr) auto}
    .grow .gd,.grow .gt{grid-column:3}
    .gfoot{padding-left:14px}
    .pick{grid-template-columns:1fr;height:auto}
    .pl{border-right:0;border-bottom:1px solid var(--line);max-height:46vh}
    .set{grid-template-columns:1fr}
  }
  `;

  /* ------------------------------- Mounting ------------------------------- */
  function mount() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'medal-detector-root';
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><div class="mh" id="mh-app"><div id="mh-fab"></div><div id="mh-modal"></div></div><div class="mh toast" id="mh-toast" role="status"></div>`;
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    mountSidebar();
    render();
    watchSidebar();
  }

  /* ---------------- Sidebar row under "Merits" (display only) ---------------- */
  const SIDEBAR_ID = 'mh-sidebar-entry';
  // Torn draws its sidebar a moment after page load. Only fall back to the floating button if the
  // sidebar never appears within this time, so the button doesn't flash on every refresh.
  const SIDEBAR_WAIT_MS = 6000;
  let sidebarFound = false;
  let sidebarWaitOver = false;
  const SIDEBAR_GOALS_ID = 'mh-sidebar-goals';
  let sidebarGoalsHtml = null;

  function togglePanel() {
    open = !open;
    if (!open) picker.open = false;
    if (open) refresh(false);
    render();
  }

  function mountSidebar() {
    if (loadSettings().button === 'floating') {
      const old = document.getElementById(SIDEBAR_ID);
      if (old) old.remove();
      const oldGoals = document.getElementById(SIDEBAR_GOALS_ID);
      if (oldGoals) oldGoals.remove();
      return false;
    }
    if (document.getElementById(SIDEBAR_ID)) { sidebarFound = true; return true; }
    // Torn's class names have changing hash suffixes, so find the Merits row by its link instead.
    const useLink = document.querySelector('a[href*="sid=awards"][href*="tab=merits"]');
    const row = useLink && useLink.closest('p');
    if (!row) return false;
    const spans = row.querySelectorAll('span');
    const entry = document.createElement('p');
    entry.id = SIDEBAR_ID;
    entry.className = row.className;
    entry.setAttribute('tabindex', '0');
    const name = document.createElement('span');
    name.className = spans[0] ? spans[0].className : '';
    name.textContent = 'Medal Detector:';
    // Just the name and [open]. Torn's label column is sized for short words ("Merits:"),
    // so force this row onto one line, with [open] on the right like Torn's [use] links.
    const force = (el, css) => Object.entries(css).forEach(([k, v]) => el.style.setProperty(k, v, 'important'));
    force(entry, { display: 'flex', 'align-items': 'center', 'white-space': 'nowrap', 'flex-wrap': 'nowrap' });
    force(name, { width: 'auto', 'min-width': '0', 'max-width': 'none', flex: '0 0 auto', 'white-space': 'nowrap', overflow: 'visible' });
    const link = document.createElement('a');
    link.href = '#';
    link.className = useLink.className;
    link.setAttribute('aria-label', 'Open Medal Detector');
    link.textContent = '[open]';
    force(link, { 'margin-left': 'auto', 'padding-left': '6px', flex: '0 0 auto', 'white-space': 'nowrap' });
    // Only opens our own window: no navigation, no request to Torn.
    link.addEventListener('click', (e) => { e.preventDefault(); togglePanel(); });
    entry.append(name, link);
    row.after(entry);
    const staleBox = document.getElementById(SIDEBAR_GOALS_ID);
    if (staleBox) staleBox.remove();
    const goalsBox = document.createElement('div');
    goalsBox.id = SIDEBAR_GOALS_ID;
    goalsBox.style.cssText = 'margin:2px 0 6px;font-size:11px;line-height:1.3';
    goalsBox.addEventListener('click', (e) => {
      if (e.target.closest('[data-mh-done]')) {
        e.preventDefault();
        store.set('mh_sb_showdone', !store.get('mh_sb_showdone', false));
        render();
        return;
      }
      if (!e.target.closest('[data-mh-goal]')) return;
      e.preventDefault();
      tab = 'overview';
      if (!open) togglePanel(); else render();
    });
    entry.after(goalsBox);
    sidebarGoalsHtml = null;
    sidebarFound = true;
    return true;
  }

  const isGoalDone = (v) => v.met || (v.allEarned && !(v.goal.daily > 0));

  // Short names for the narrow sidebar ("Busts: 3/5"). Award-only goals keep the award's name.
  const SHORT_LABEL = {
    peoplebusted: 'Busts', peoplebought: 'Bails', bloodwithdrawn: 'Blood bags', revives: 'Revives', medicalitemsused: 'Medical items',
    attackswon: 'Attacks won', defendswon: 'Defends won', attackswonabroad: 'Wins abroad', attackcriticalhits: 'Critical hits', attackhits: 'Hits',
    onehitkills: 'One hit kills', attacksstealthed: 'Stealth attacks', attacksassisted: 'Assists', retals: 'Retaliations', rankedwarhits: 'RW hits',
    unarmoredwon: 'Unarmoured wins', attackdamage: 'Damage', bestdamage: 'Best hit', respectforfaction: 'Respect', bestkillstreak: 'Kill streak',
    roundsfired: 'Rounds fired', specialammoused: 'Special ammo', traveltimes: 'Trips abroad', traveltime: 'Hours flying', itemsboughtabroad: 'Imports',
    drugsused: 'Drugs', xantaken: 'Xanax', cantaken: 'Cannabis', exttaken: 'Ecstasy', kettaken: 'Ketamine', lsdtaken: 'LSD', opitaken: 'Opium',
    pcptaken: 'PCP', shrtaken: 'Shrooms', spetaken: 'Speed', victaken: 'Vicodin', overdosed: 'Overdoses', candyused: 'Candy', energydrinkused: 'Energy drinks',
    alcoholused: 'Alcohol', boostersused: 'Boosters', booksread: 'Books', statenhancersused: 'Stat enhancers', cityfinds: 'City finds', dumpfinds: 'Dump finds',
    itemsdumped: 'Items trashed', missionscompleted: 'Missions', contractscompleted: 'Contracts', missioncreditsearned: 'Mission credits',
    bountiescollected: 'Bounties', totalbountyreward: 'Bounty cash', racesentered: 'Races', raceswon: 'Races won', racingpointsearned: 'Racing points',
    racingskill: 'Racing skill', refills: 'Energy refills', nerverefills: 'Nerve refills', tokenrefills: 'Token refills', jobpointsused: 'Job points',
    organisedcrimes: 'OCs', criminaloffenses: 'Crimes', useractivity: 'Minutes active', bestactivestreak: 'Online streak', networth: 'Networth',
    __level: 'Level', __age: 'Days old', __factiondays: 'Faction days', __married: 'Days married', __awards: 'Awards', __total: 'Battle stats',
    __str: 'Strength', __def: 'Defense', __spd: 'Speed', __dex: 'Dexterity', __edu: 'Courses', __perks: 'Perks', __workmax: 'Working stat',
  };
  const sidebarLabel = (g) => (g.stat ? SHORT_LABEL[g.stat] || statLabel(g.stat) : goalLabel(g));

  function updateSidebar(views) {
    const box = document.getElementById(SIDEBAR_GOALS_ID);
    if (!box) return;
    const collapsed = loadSettings().sidebarGoals === false;
    let html = '';
    if (views.length && !collapsed) {
      const showDone = !!store.get('mh_sb_showdone', false);
      const doneCount = views.filter(isGoalDone).length;
      const shown = showDone ? views : views.filter((v) => !isGoalDone(v));
      const order = [...shown].sort((a, b) => (isGoalDone(a) - isGoalDone(b)) || ((b.goal.daily > 0) - (a.goal.daily > 0)));
      html = order.map((v) => {
        const g = v.goal;
        const isDaily = g.daily > 0;
        const pct = isDaily ? v.pct : v.lifePct || 0;
        const right = v.checklist ? (v.awardEarned ? '✓' : 'to do') : isDaily ? `${v.met ? '✓ ' : ''}${fmt(v.done)}/${fmt(g.daily)}` : v.lifetime ? `${fmt(v.total)}/${fmt(v.lifetime)}` : fmt(v.total);
        const color = isGoalDone(v) ? '#7cbf5a' : isDaily ? '#c8a24c' : '#7d97d6';
        const full = g.award && g.stat ? `${statLabel(g.stat)} (${g.award.name})` : goalLabel(g);
        const tip = isDaily ? `${full}: ${fmt(v.done)} of ${fmt(g.daily)} today` : `${full}${v.lifetime ? `: ${fmt(v.total)} of ${fmt(v.lifetime)}` : ''}`;
        return `<div data-mh-goal="1" title="${esc(tip)}" style="cursor:pointer;padding:2px 0">
          <div style="display:flex;gap:4px;align-items:center">
          <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85">${esc(sidebarLabel(g))}:</span>
          <span style="flex:none;font-weight:bold;${isGoalDone(v) ? 'color:#7cbf5a' : ''}">${right}</span></div>
          ${v.checklist ? '' : `<div style="height:3px;background:rgba(128,128,128,.25);border-radius:2px;overflow:hidden;margin-top:2px"><div style="height:100%;width:${pct}%;background:${color}"></div></div>`}</div>`;
      }).join('');
      if (doneCount) {
        html += `<div data-mh-done="1" title="${showDone ? 'Hide finished goals' : 'Show finished goals'}" style="cursor:pointer;padding:3px 0 0;color:#7cbf5a;opacity:.85">✓ ${doneCount} done today · ${showDone ? 'hide' : 'show'}</div>`;
      }
      if (!shown.length && doneCount && !showDone) html = `<div style="padding:2px 0;color:#7cbf5a">All goals done today</div>` + html;
    }
    if (html !== sidebarGoalsHtml) { box.innerHTML = html; sidebarGoalsHtml = html; }
    box.style.display = html ? '' : 'none';
  }

  // Torn redraws the sidebar now and then; put the row back if it disappears.
  // This only edits page layout — it never clicks anything or makes a request.
  function watchSidebar() {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        if (loadSettings().button === 'floating' || document.getElementById(SIDEBAR_ID)) return;
        if (mountSidebar()) render(true);
      }, 100);
    }).observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { sidebarWaitOver = true; if (!sidebarFound) render(true); }, SIDEBAR_WAIT_MS);
  }

  /* ------------------------------- Shell ------------------------------- */
  const TABS = [
    ['overview', 'overview', 'Overview'],
    ['honors', 'honours', 'Honours'],
    ['medals', 'medals', 'Medals'],
    ['goals', 'goals', 'Goals'],
    ['history', 'history', 'History'],
    ['settings', 'settings', 'Settings'],
  ];
  // page state
  const awardView = { honors: { filter: 'progress', search: '' }, medals: { filter: 'progress', search: '' } };
  let expanded = null; // award key of the open row
  const picker = { open: false, sel: null, filter: 'all', search: '', hideEarned: true, daily: 5, target: 'this', custom: '' };

  function toast(msg) {
    const t = root && root.getElementById('mh-toast');
    if (!t) return;
    t.innerHTML = `${icon('check')}<span>${esc(msg)}</span>`;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Set innerHTML only when it actually changed, so nothing redraws needlessly.
  function setHtml(el, html) {
    if (el && el._mhHtml !== html) { el.innerHTML = html; el._mhHtml = html; }
  }

  let shownPage = null;

  function buildCtx() {
    const settings = loadSettings();
    const state = loadState();
    const goals = loadGoals();
    const ms = getMilestones(state);
    const views = goals.filter((g) => g.on).map((g) => goalView(state, g, ms));
    const dailyViews = views.filter((v) => v.goal.daily > 0);
    const metCount = dailyViews.filter((v) => v.met).length;
    return { settings, state, goals, ms, views, dailyViews, metCount };
  }

  function render(soft) {
    if (!root) return;
    // Don't wipe something the user is typing into on a background refresh.
    if (soft && root.activeElement && /^(INPUT|SELECT)$/.test(root.activeElement.tagName)) return;
    const fabBox = root.getElementById('mh-fab');
    const modalBox = root.getElementById('mh-modal');
    if (!fabBox || !modalBox) return;
    const ctx = buildCtx();
    const { settings, state, goals, ms, dailyViews, metCount } = ctx;
    updateSidebar(ctx.views);

    let fab = '';
    if (settings.button === 'floating' || isSmallScreen() || (!sidebarFound && sidebarWaitOver && !document.getElementById(SIDEBAR_ID))) {
      const allDone = metCount === dailyViews.length;
      const fabPos = settings.side === 'left' ? 'left:12px' : 'right:12px';
      const badge = dailyViews.length ? `<span class="badge ${allDone ? 'ok' : ''}">${allDone ? '✓' : dailyViews.length - metCount}</span>` : '';
      fab = `<button class="fab" data-a="toggle" style="${fabPos}" title="Medal Detector" aria-label="Open Medal Detector">${icon('medals')}${badge}</button>`;
    }
    setHtml(fabBox, fab);

    if (!open) { setHtml(modalBox, ''); shownPage = null; return; }

    // The window is built once per opening; switching pages only swaps its content.
    if (!root.getElementById('mh-main')) {
      setHtml(modalBox, `<div class="backdrop" data-backdrop="1">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Medal Detector">
          <header class="top">
            <div class="brand"><span class="mark">${icon('medals')}</span><div><h1>Medal Detector</h1><p id="mh-sub"></p></div></div>
            <span class="updated" id="mh-upd"></span>
            <button class="tool" id="mh-refresh" data-a="refresh" title="Check for progress now" aria-label="Check for progress now">${icon('refresh')}</button>
            <button class="tool" data-a="close" title="Close (Esc)" aria-label="Close">${icon('close')}</button>
          </header>
          <nav class="nav" id="mh-nav" aria-label="Sections"></nav>
          <main class="main" id="mh-main"></main>
        </div></div>`);
      shownPage = null;
    }

    const now = Date.now();
    const sub = root.getElementById('mh-sub');
    const subText = `New Torn day in ${fmtLeft(dayStart(now) + DAY_MS - now)}`;
    if (sub && sub.textContent !== subText) sub.textContent = subText;
    const upd = root.getElementById('mh-upd');
    const updText = state.lastFetch ? `Updated ${new Date(state.lastFetch).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '';
    if (upd && upd.textContent !== updText) upd.textContent = updText;
    const rbtn = root.getElementById('mh-refresh');
    if (rbtn) rbtn.className = refreshing ? 'tool spin' : 'tool';

    const inProgress = (kind) => (ms ? ms.all.filter((a) => a.kind === kind && !a.earned && a.stat).length : 0);
    const counts = {
      overview: dailyViews.length ? `${metCount}/${dailyViews.length}` : '',
      honors: ms ? String(inProgress('honors')) : '',
      medals: ms ? String(inProgress('medals')) : '',
      goals: goals.length ? String(goals.length) : '',
    };
    setHtml(root.getElementById('mh-nav'), TABS.map(([id, ic, label]) =>
      `<button data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${counts[id] ? `<span class="count">${counts[id]}</span>` : ''}</button>`).join('') +
      `<div class="foot">Uses only the Torn API.<br>By Eaglewing [571041]</div>`);

    const main = root.getElementById('mh-main');
    const pageId = tab + (tab === 'goals' && picker.open ? ':picker' : '');
    const keep = shownPage === pageId;
    const q = (sel) => (root.querySelector ? root.querySelector(sel) : null);
    const listScroll = keep && q('.plist') ? q('.plist').scrollTop : 0;
    const scroll = keep ? main.scrollTop : 0;
    setHtml(main, pageHtml(tab, ctx));
    main.scrollTop = scroll;
    const pl = q('.plist');
    if (pl && listScroll) pl.scrollTop = listScroll;
    shownPage = pageId;
    applySearch();
  }

  function pageHtml(t, ctx) {
    if (t === 'honors' || t === 'medals') return awardsHtml(t, ctx);
    if (t === 'goals') return picker.open ? pickerHtml(ctx) : goalsHtml(ctx);
    if (t === 'history') return historyHtml(ctx);
    if (t === 'settings') return settingsHtml(ctx);
    return overviewHtml(ctx);
  }

  function noticesHtml(state) {
    let h = '';
    if (!getKey()) h += `<div class="note warn" style="margin:0 0 16px">${icon('settings')}<span>Add a <b>Limited</b> API key in <a href="#" class="link" data-tab-link="settings">Settings</a> to start tracking. One key covers everything.</span></div>`;
    if (state.error) h += `<div class="note err" style="margin:0 0 16px">${icon('close')}<span>${esc(state.error)}</span></div>`;
    if (state.catError) h += `<div class="note err" style="margin:0 0 16px">${icon('close')}<span>Award list: ${esc(state.catError)}</span></div>`;
    return h;
  }

  /* ------------------------------ Shared bits ------------------------------ */
  const progressCell = (pct, value, target, cls = '') =>
    `<div class="prog"><span class="v">${fmt(value)} <small>/ ${fmt(target)}</small></span><span class="line ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span></div>`;

  function statusMark(a) {
    if (a.earned) return `<span class="st done">${icon('check')}</span>`;
    if (a.stat && a.value != null) return `<span class="st part" style="--p:${Math.floor(a.pct)}"></span>`;
    return '<span class="st"></span>';
  }

  // Goal already covers this award? (a goal for the award itself, or a stat goal aimed at the top award)
  const coveredBy = (goals, a) => goals.find((g) => (g.award && `${g.award.kind}:${g.award.id}` === a.key) || (a.stat && g.stat === a.stat && g.auto && !g.award));

  // Days to finish at your recent pace (drug cooldowns cap it).
  function etaDays(state, stat, remaining) {
    if (!remaining) return 0;
    let rate = avgDaily(state, stat);
    const di = drugInfo(stat);
    if (di) rate = rate ? Math.min(rate, di.maxDay) : null;
    return rate ? Math.ceil(remaining / rate) : null;
  }

  function etaText(stat, state, ms, daily) {
    const x = ms && ms.stats[stat];
    const value = statValue(state, stat);
    if (!x || value == null || !x.next) return '';
    if (!(daily > 0)) return STAT_BY_KEY[stat] && STAT_BY_KEY[stat].milestoneOnly ? '' : 'Set a daily amount to see how long it will take.';
    const nextRem = Math.max(0, x.next.threshold - value);
    const topRem = Math.max(0, x.top.threshold - value);
    const parts = [`next award in <b>${humanDays(Math.ceil(nextRem / daily))}</b>`];
    if (x.top.id !== x.next.id || x.top.kind !== x.next.kind) parts.push(`top award in <b>${humanDays(Math.ceil(topRem / daily))}</b>`);
    const di = drugInfo(stat);
    const warn = di && daily > di.maxDay ? ` <span class="bad">More than the cooldown allows (about ${di.maxDay} a day at most).</span>` : '';
    return `At ${fmt(daily)} a day: ${parts.join(', ')}.${warn}`;
  }

  function drugHtml(stat, x, value) {
    if (stat === 'drugsused') return `<div class="note">${icon('drugs')}<span>Any drug counts. Ketamine has the shortest cooldown (${fmtMins(drugInfo('kettaken').lo)} to ${fmtMins(drugInfo('kettaken').hi)}), then Cannabis (${fmtMins(drugInfo('cantaken').lo)} to ${fmtMins(drugInfo('cantaken').hi)}).</span></div>`;
    const di = drugInfo(stat);
    if (!di) return '';
    let h = `Cooldown <b>${fmtMins(di.lo)} to ${fmtMins(di.hi)}</b>, so at most <b>${di.minDay === di.maxDay ? di.maxDay : `${di.minDay} to ${di.maxDay}`} a day</b> taken back to back.`;
    if (x && x.next && value != null && x.next.threshold > value) {
      const nextRem = Math.max(0, x.next.threshold - value);
      const topRem = Math.max(0, x.top.threshold - value);
      h += ` Fastest possible: next award in <b>${daysRange(nextRem, drugInfo(stat))}</b>${x.top.key !== x.next.key ? `, top award in <b>${daysRange(topRem, drugInfo(stat))}</b>` : ''}.`;
    }
    h += DRUG_OD[stat] ? ` Overdose risk: ${DRUG_OD[stat]}.` : ' Overdosing can add hours to the cooldown.';
    return `<div class="note">${icon('drugs')}<span>${h}</span></div>`;
  }

  // Every award that counts the same stat, as a vertical path.
  function pathHtml(stat, ms, highlightKey) {
    const x = ms && ms.stats[stat];
    if (!x) return '';
    return `<div class="tiers">` + x.list.map((t) => {
      const isNext = x.next && t.key === x.next.key;
      const rem = x.value == null ? null : Math.max(0, t.threshold - x.value);
      return `<div class="tier ${t.earned ? 'got' : isNext ? 'next' : ''} ${t.key === highlightKey ? 'here' : ''}" title="${esc(t.desc)}">
        <span class="nm">${esc(t.name)}<small>${kindName(t.kind)}, ${fmt(t.threshold)}</small></span>
        <span class="r">${t.earned ? 'Earned' : rem == null ? '' : rem === 0 ? 'Due' : `${fmt(rem)} to go`}</span></div>`;
    }).join('') + `</div>`;
  }

  /* ------------------------------ Overview ------------------------------ */
  function overviewHtml(ctx) {
    const { state, goals, ms, views, dailyViews, metCount } = ctx;
    let h = noticesHtml(state);
    const best = views.reduce((m, v) => Math.max(m, v.streak || 0), 0);
    const tot = ms ? ms.totals : null;
    const fig = (n, of, label, pct, ok) => `<div class="fig ${ok ? 'ok' : ''}"><span class="fig-n">${n}${of != null ? `<small> / ${of}</small>` : ''}</span><span class="fig-l">${label}</span><div class="fig-rule"><i style="width:${pct}%"></i></div></div>`;
    h += `<div class="ph"><div><h2>Overview</h2><p>Today's goals and the awards you're closest to.</p></div></div>
      <div class="board">
        ${fig(dailyViews.length ? metCount : '–', dailyViews.length || null, 'Daily goals done', dailyViews.length ? (metCount / dailyViews.length) * 100 : 0, dailyViews.length && metCount === dailyViews.length)}
        ${fig(tot ? fmt(tot.honors[0]) : '–', tot ? fmt(tot.honors[1]) : null, 'Honours earned', tot ? (tot.honors[0] / tot.honors[1]) * 100 : 0)}
        ${fig(tot ? fmt(tot.medals[0]) : '–', tot ? fmt(tot.medals[1]) : null, 'Medals earned', tot ? (tot.medals[0] / tot.medals[1]) * 100 : 0)}
        ${fig(best ? plural(best, 'day') : '–', null, 'Best goal streak', Math.min(100, best * 10))}
      </div>`;

    h += `<h3>${icon('goals')}Today <span class="n">${views.length}</span></h3>`;
    if (!views.length) {
      h += `<div class="list"><div class="empty"><b>No goals yet</b>Choose an honour, medal or stat to work towards.<br><button class="btn primary" data-a="newgoal">${icon('plus')}New goal</button></div></div>`;
    } else {
      const order = [...views].sort((a, b) => (isGoalDone(a) - isGoalDone(b)) || ((b.goal.daily > 0) - (a.goal.daily > 0)));
      h += `<div class="list">` + order.map((v) => todayRow(v, ms)).join('') + `</div>`;
    }

    if (ms) {
      const closest = ms.all.filter((a) => !a.earned && a.stat && a.value != null && a.remaining > 0)
        .map((a) => Object.assign({ eta: etaDays(state, a.stat, a.remaining) }, a))
        .sort((a, b) => (a.eta == null) - (b.eta == null) || (a.eta - b.eta) || (b.pct - a.pct)).slice(0, 8);
      const due = ms.all.filter((a) => !a.earned && a.stat && a.value != null && a.remaining === 0);
      if (due.length) {
        h += `<h3>${icon('check')}Requirement met <span class="n">${due.length}</span></h3><div class="list">` + due.slice(0, 5).map((a) => `<div class="item"><div class="row"><span class="st done">${icon('check')}</span><span class="t"><b>${esc(a.name)}</b><span>${kindName(a.kind)}. ${esc(a.desc)}</span></span><span class="meta">Torn should award it shortly</span></div><div class="act"></div></div>`).join('') + (due.length > 5 ? `<div class="group-h">And ${due.length - 5} more on the Honours and Medals pages</div>` : '') + `</div>`;
      }
      h += `<h3>${icon('medals')}Closest awards <span class="n">by estimated time</span></h3>`;
      if (!closest.length) h += `<div class="list"><div class="empty">Nothing in progress yet. Progress appears after the first check.</div></div>`;
      else h += `<div class="list">` + closest.map((a) => {
        const g = coveredBy(goals, a);
        return `<div class="item"><div class="row">${statusMark(a)}<span class="t"><b>${esc(a.name)}</b><span>${kindName(a.kind)}. ${esc(a.desc)}${a.eta != null ? `. About ${humanDays(a.eta)} at your pace` : ''}</span></span>${progressCell(a.pct, a.value, a.threshold)}</div>
          <div class="act">${g ? `<span class="pill brass">${icon('goals')}Goal set</span>` : `<button class="btn quiet" data-a="goalfor" data-key="${a.key}">${icon('plus')}Set goal</button>`}</div></div>`;
      }).join('') + `</div>`;
    }
    return h;
  }

  function todayRow(v, ms) {
    const g = v.goal;
    const done = isGoalDone(v);
    const mark = done ? `<span class="st done">${icon('check')}</span>` : `<span class="st icon">${goalIcon(g, ms)}</span>`;
    let sub = '';
    if (v.checklist) sub = v.awardEarned ? 'Earned' : 'Ticked off when Torn awards it';
    else {
      const bits = [];
      if (v.award && !v.awardEarned) bits.push(v.total >= v.award.threshold ? `${kindName(v.award.kind)} requirement met, Torn should award it shortly` : `${kindName(v.award.kind)}: ${fmt(v.total)} of ${fmt(v.award.threshold)}`);
      else if (v.topAward && !v.allEarned) bits.push(v.total >= v.topAward.threshold ? `Requirement met for ${v.topAward.name}` : `Top award ${v.topAward.name}: ${fmt(v.total)} of ${fmt(v.topAward.threshold)}`);
      else if (v.allEarned) bits.push('Every award for this stat earned');
      else if (v.lifetime) bits.push(`Target ${fmt(v.total)} of ${fmt(v.lifetime)}`);
      else if (v.total != null) bits.push(`Total ${fmt(v.total)}`);
      if (v.eta) bits.push(`about ${humanDays(v.eta)} to go`);
      sub = bits.join(', ');
    }
    let right;
    if (g.daily > 0) right = progressCell(v.pct, v.done, g.daily, v.met ? 'done' : '');
    else if (v.checklist) right = `<div class="prog"><span class="meta ${v.awardEarned ? 'done' : ''}">${v.awardEarned ? 'Earned' : 'In-game'}</span></div>`;
    else if (v.lifetime) right = progressCell(v.lifePct || 0, v.total, v.lifetime, 'blue');
    else right = `<div class="prog"><span class="v">${fmt(v.total)}</span></div>`;
    const streakPill = v.streak > 1 ? `<span class="pill brass" title="${v.streak} days in a row">${icon('flame')}${v.streak}</span>` : '';
    const link = STAT_BY_KEY[g.stat] && STAT_BY_KEY[g.stat].link && !done ? `<a class="btn quiet" href="${STAT_BY_KEY[g.stat].link}" title="Open the page for this">Go</a>` : '';
    return `<div class="item"><div class="row">${mark}<span class="t"><b>${esc(goalLabel(g))}</b><span>${esc(sub)}</span></span>${right}</div><div class="act">${streakPill}${link}</div></div>`;
  }

  /* --------------------------- Honours and medals --------------------------- */
  function awardsHtml(kind, ctx) {
    const { state, goals, ms } = ctx;
    const view = awardView[kind];
    const title = kind === 'medals' ? 'Medals' : 'Honours';
    let h = noticesHtml(state);
    if (!ms) return h + `<div class="ph"><div><h2>${title}</h2></div></div><div class="list"><div class="empty"><b>Award list not loaded yet</b>It loads with the first check.<br><button class="btn primary" data-a="reloadcat">Load now</button></div></div>`;
    const items = ms.all.filter((a) => a.kind === kind);
    const lists = {
      progress: items.filter((a) => !a.earned && a.stat),
      manual: items.filter((a) => !a.earned && !a.stat),
      earned: items.filter((a) => a.earned),
      all: items,
    };
    const tot = ms.totals[kind];
    const lead = kind === 'medals'
      ? `You have ${fmt(tot[0])} of ${fmt(tot[1])} medals. Medals mark milestones like level, attacks and commitment.`
      : `You have ${fmt(tot[0])} of ${fmt(tot[1])} honours. Honours are the bars you can show on your profile.`;
    h += `<div class="ph"><div><h2>${title}</h2><p>${lead}${ms.known ? '' : ' Which ones you own loads with the next check.'}</p></div></div>
      <div class="toolbar"><div class="field">${icon('search')}<input type="search" id="a-search" data-kind="${kind}" placeholder="Search ${title.toLowerCase()}" value="${esc(view.search)}" aria-label="Search ${title.toLowerCase()}"></div>
        <div class="seg" role="group" aria-label="Filter">${[['progress', 'In progress'], ['manual', 'In-game only'], ['earned', 'Earned'], ['all', 'All']].map(([id, l]) =>
          `<button data-filter="${id}" data-kind="${kind}" aria-pressed="${view.filter === id}">${l}<span class="n">${lists[id].length}</span></button>`).join('')}</div></div>`;
    const list = lists[view.filter];
    if (view.filter === 'manual') h += `<p class="desc">These can't be counted from your stats, so they're done in-game. You can still add any of them as a goal, and it's ticked off when Torn awards it.</p>`;
    if (!list.length) return h + `<div class="list"><div class="empty">${view.filter === 'earned' ? 'None earned yet.' : 'Nothing here.'}</div></div>`;

    let rows = '';
    if (view.filter === 'progress') {
      rows = [...list].sort((a, b) => (b.value != null) - (a.value != null) || ((a.remaining === 0) - (b.remaining === 0)) || b.pct - a.pct).map((a) => awardRow(a, ctx)).join('');
    } else {
      const groups = {};
      for (const a of list) (groups[a.category] = groups[a.category] || []).push(a);
      rows = Object.keys(groups).sort().map((c) => `<div class="group-h" data-group="${esc(c)}">${catIcon(c)}${esc(c)}<span class="n">${groups[c].length}</span></div>` +
        groups[c].sort((a, b) => (a.threshold || 0) - (b.threshold || 0) || a.name.localeCompare(b.name)).map((a) => awardRow(a, ctx)).join('')).join('');
    }
    return h + `<div class="list" id="a-list">${rows}</div><div class="empty" id="a-none" hidden>No matches.</div>
      <p class="meta" style="margin-top:12px">Award list from Torn, checked ${new Date(ms.fetched).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. <a href="#" class="link" data-a="reloadcat">Check again</a></p>`;
  }

  function awardRow(a, ctx) {
    const { state, goals, ms } = ctx;
    const isOpen = expanded === a.key;
    let right;
    if (a.earned) right = `<div class="prog"><span class="meta done">Earned</span></div>`;
    else if (a.stat && a.value != null && a.remaining === 0) right = `<div class="prog"><span class="meta done">Requirement met</span><span class="line done"><i style="width:100%"></i></span></div>`;
    else if (a.stat && a.value != null) right = progressCell(a.pct, a.value, a.threshold);
    else if (a.stat) right = `<div class="prog"><span class="meta">No data yet</span></div>`;
    else right = `<div class="prog"><span class="meta">In-game only</span></div>`;
    const g = coveredBy(goals, a);
    const act = a.earned ? '' : g ? `<span class="pill brass">${icon('goals')}Goal set</span>` : `<button class="btn quiet" data-a="goalfor" data-key="${a.key}">${icon('plus')}Set goal</button>`;
    let detail = '';
    if (isOpen) {
      detail = `<div class="expand">`;
      if (a.stat) {
        const x = ms.stats[a.stat];
        const eta = !a.earned && a.remaining ? etaDays(state, a.stat, a.remaining) : null;
        detail += `<div class="kv"><div><b>${fmt(a.value)}</b>${esc(statLabel(a.stat))}</div><div><b>${fmt(a.threshold)}</b>Needed</div>${!a.earned && a.remaining != null ? `<div><b>${fmt(a.remaining)}</b>To go</div>` : ''}${eta ? `<div><b>${humanDays(eta)}</b>At your recent pace</div>` : ''}</div>`;
        if (x && x.list.length > 1) detail += `<span class="meta">Every award for ${esc(statLabel(a.stat).toLowerCase())}</span>` + pathHtml(a.stat, ms, a.key);
        detail += drugHtml(a.stat, x, a.value);
        if (STAT_NOTE[a.stat]) detail += `<div class="note">${icon('other')}<span>${esc(STAT_NOTE[a.stat])}</span></div>`;
      } else {
        detail += `<div class="note">${icon('other')}<span>The API has no counter for this, so it's done in-game. Add it as a goal and Medal Detector ticks it off as soon as it appears on your profile.</span></div>`;
      }
      detail += `</div>`;
    }
    const search = `${a.name} ${a.desc} ${a.category} ${a.stat ? statLabel(a.stat) : ''}`.toLowerCase();
    return `<div class="item ${isOpen ? 'open' : ''}" data-search="${esc(search)}"><button class="row" data-expand="${a.key}" aria-expanded="${isOpen}">${statusMark(a)}<span class="t"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></span>${right}</button><div class="act">${act}</div>${detail}</div>`;
  }

  // Filter visible rows in place, so typing keeps focus and scroll.
  function applySearch() {
    if (!root.querySelectorAll) return;
    let q = '';
    let scope = null;
    if ((tab === 'honors' || tab === 'medals') && root.getElementById('a-list')) { q = awardView[tab].search; scope = root.getElementById('a-list'); }
    if (tab === 'goals' && picker.open && root.querySelector('.plist')) { q = picker.search; scope = root.querySelector('.plist'); }
    if (!scope) return;
    q = q.trim().toLowerCase();
    let shown = 0;
    scope.querySelectorAll('[data-search]').forEach((el) => {
      const hit = !q || el.dataset.search.includes(q);
      el.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    scope.querySelectorAll('.group-h').forEach((gh) => {
      let n = gh.nextElementSibling, any = false;
      while (n && !n.classList.contains('group-h')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; }
      gh.style.display = any ? '' : 'none';
    });
    const none = root.getElementById('a-none') || root.getElementById('p-none');
    if (none) none.hidden = shown > 0;
  }

  /* --------------------------------- Goals --------------------------------- */
  function goalsHtml(ctx) {
    const { state, goals, ms } = ctx;
    let h = noticesHtml(state) + `<div class="ph"><div><h2>Goals</h2><p>Daily targets and the awards you're working towards. Changes save automatically.</p></div>
      <button class="btn primary" data-a="newgoal">${icon('plus')}New goal</button></div>`;
    if (!goals.length) return h + `<div class="list"><div class="empty"><b>No goals yet</b>Pick from every honour, medal and stat.<br><button class="btn primary" data-a="newgoal">${icon('plus')}New goal</button></div></div>`;
    h += `<div class="list">`;
    for (const g of goals) {
      const v = goalView(state, g, ms);
      const label = goalLabel(g);
      let sub;
      if (g.award) sub = `${kindName(g.award.kind)}${g.stat ? `, counted from ${statLabel(g.stat).toLowerCase()}` : ', done in-game'}`;
      else sub = `Total ${fmt(v.total)}`;
      let target;
      if (v.checklist) target = `<div class="tgt">${v.awardEarned ? '<b>Earned</b>' : 'Ticked off when<br>Torn awards it'}</div>`;
      else if (g.award) target = `<div class="tgt">Target<br><b>${v.award ? fmt(v.award.threshold) : '–'}</b></div>`;
      else if (g.auto) target = `<div class="tgt">Top award<br><b>${v.allEarned ? 'All earned' : v.topAward ? `${esc(v.topAward.name)}, ${fmt(v.topAward.threshold)}` : 'Loading'}</b></div>`;
      else target = `<div class="gt"><label for="gl-${g.id}">Lifetime target</label><input id="gl-${g.id}" type="number" min="1" data-f="lifetime" value="${g.lifetime || ''}" placeholder="None"></div>`;
      const growsAlone = g.stat && STAT_BY_KEY[g.stat] && STAT_BY_KEY[g.stat].milestoneOnly && !(g.daily > 0);
      const daily = v.checklist || growsAlone ? '<div></div>' : `<div class="gd"><label for="gd-${g.id}">Per day</label><input id="gd-${g.id}" type="number" min="0" data-f="daily" value="${g.daily || 0}"></div>`;
      let foot = '';
      if (!v.checklist && v.lifetime && v.total != null) {
        const e = g.stat ? etaText(g.stat, state, ms, g.daily) : '';
        foot = `<div class="gfoot"><span class="line blue"><i style="width:${v.lifePct || 0}%"></i></span><span class="meta num">${fmt(v.total)} / ${fmt(v.lifetime)}</span>${e ? `<span class="eta" style="grid-column:1/-1;margin:0">${e}</span>` : ''}</div>`;
      }
      h += `<div class="item" data-id="${g.id}" style="display:block"><div class="grow ${g.on ? '' : 'off'}">
        <input type="checkbox" data-f="on" ${g.on ? 'checked' : ''} aria-label="${g.on ? 'Pause' : 'Resume'} ${esc(label)}" title="${g.on ? 'Active. Untick to pause.' : 'Paused. Tick to resume.'}">
        <span class="st icon">${goalIcon(g, ms)}</span>
        <span class="t"><b>${esc(label)}</b><span>${esc(sub)}</span></span>
        ${daily}${target}
        <button class="btn danger" data-a="del" aria-label="Delete ${esc(label)}" title="Delete goal">${icon('trash')}</button>
      </div>${foot}</div>`;
    }
    return h + `</div>`;
  }

  /* ------------------------------ Goal picker ------------------------------ */
  // Every honour, medal and stat in one searchable list.
  function pickerEntries(ms, state) {
    const out = [];
    if (ms) {
      for (const a of ms.all) {
        let r, cls = '';
        if (a.earned) { r = 'Earned'; cls = 'done'; }
        else if (a.stat && a.value != null) { r = a.remaining === 0 ? 'Due' : `${Math.floor(a.pct)}%`; if (a.remaining === 0) cls = 'done'; }
        else if (a.stat) r = '';
        else r = 'In-game';
        out.push({ key: a.key, type: a.kind, name: a.name, sub: a.desc, r, cls, earned: a.earned, icon: catIcon(a.category), search: `${a.name} ${a.desc} ${a.category} ${a.stat ? statLabel(a.stat) : ''}`.toLowerCase(), order: a.earned ? 3 : a.stat && a.value != null ? (a.remaining === 0 ? 1 : 0) : 2, pct: a.pct || 0 });
      }
    }
    for (const s of STATS) {
      const value = statValue(state, s.key);
      const x = ms && ms.stats[s.key];
      out.push({ key: `stat:${s.key}`, type: 'stats', name: s.label, sub: x ? `${x.earned} of ${x.list.length} awards earned` : s.group, r: value == null ? '' : fmt(value), cls: '', earned: false, icon: statIcon(s.key), search: `${s.label} ${s.group} ${s.key}`.toLowerCase(), order: 0, pct: 0 });
    }
    return out;
  }

  function pickerListHtml(ms, state) {
    const all = pickerEntries(ms, state);
    const sections = [['honors', 'Honours'], ['medals', 'Medals'], ['stats', 'Stats']].filter(([t]) => picker.filter === 'all' || picker.filter === t);
    let h = '';
    for (const [t, label] of sections) {
      let list = all.filter((e) => e.type === t && !(picker.hideEarned && e.earned));
      if (t !== 'stats') list.sort((a, b) => a.order - b.order || b.pct - a.pct || a.name.localeCompare(b.name));
      if (!list.length) continue;
      h += `<div class="group-h">${t === 'stats' ? icon('history') : icon(t === 'medals' ? 'medals' : 'honours')}${label}<span class="n">${list.length}</span></div>`;
      h += list.map((e) => `<button class="pent" data-pick="${e.key}" data-search="${esc(e.search)}" aria-selected="${picker.sel === e.key}"><span class="st icon">${e.icon}</span><span class="t"><b>${esc(e.name)}</b><span>${esc(e.sub)}</span></span><span class="r ${e.cls}">${e.r}</span></button>`).join('');
    }
    return h || '<div class="empty">Nothing to show.</div>';
  }

  function pickerHtml(ctx) {
    const { state, ms } = ctx;
    const counts = { all: 0, honors: 0, medals: 0, stats: STATS.length };
    if (ms) { counts.honors = ms.all.filter((a) => a.kind === 'honors' && !(picker.hideEarned && a.earned)).length; counts.medals = ms.all.filter((a) => a.kind === 'medals' && !(picker.hideEarned && a.earned)).length; }
    counts.all = counts.honors + counts.medals + counts.stats;
    return noticesHtml(state) + `<div class="ph"><div><h2>New goal</h2><p>Choose anything to work towards: an honour, a medal or a stat.</p></div>
        <button class="btn secondary" data-a="closepicker">${icon('back')}Back to goals</button></div>
      <div class="pick">
        <div class="pl">
          <div class="pl-top">
            <div class="field">${icon('search')}<input type="search" id="p-search" placeholder="Search everything" value="${esc(picker.search)}" aria-label="Search honours, medals and stats"></div>
            <div class="seg" role="group" aria-label="Show">${[['all', 'All'], ['honors', 'Honours'], ['medals', 'Medals'], ['stats', 'Stats']].map(([id, l]) =>
              `<button data-pfilter="${id}" aria-pressed="${picker.filter === id}">${l}<span class="n">${counts[id]}</span></button>`).join('')}</div>
            <label class="check"><input type="checkbox" id="p-hide" ${picker.hideEarned ? 'checked' : ''}> Hide awards I already have</label>
          </div>
          <div class="plist" id="p-list">${pickerListHtml(ms, state)}<div class="empty" id="p-none" hidden>No matches.</div></div>
        </div>
        <div class="pd" id="p-detail">${pickerDetailHtml(ctx)}</div>
      </div>`;
  }

  function pickerDetailHtml(ctx) {
    const { state, ms, goals } = ctx;
    if (!picker.sel) return `<div class="empty"><b>Pick something on the left</b>You'll see where you are, every award on the way, and suggested daily targets.</div>`;
    const isStat = picker.sel.startsWith('stat:');
    const a = !isStat && ms ? ms.byId[picker.sel] : null;
    const stat = isStat ? picker.sel.slice(5) : a && a.stat;
    if (!isStat && !a) return `<div class="empty">That award isn't in the list any more.</div>`;
    const x = stat && ms && ms.stats[stat];
    const value = stat ? statValue(state, stat) : null;
    const avg = stat ? avgDaily(state, stat) : null;
    let h = '';

    if (a) {
      h += `<span class="pill ${a.earned ? 'done' : ''}">${a.kind === 'medals' ? icon('medals') : icon('honours')}${kindName(a.kind)}${a.earned ? ', earned' : ''}</span>
        <h4>${esc(a.name)}</h4><p class="desc">${esc(a.desc)}</p>`;
      if (!a.stat) {
        const dup = goals.find((g) => g.award && `${g.award.kind}:${g.award.id}` === a.key);
        h += `<div class="note">${icon('other')}<span>The API has no counter for this one, so it's done in-game. As a goal, it shows on your list and in the sidebar, and it's ticked off automatically when Torn awards it.</span></div>
          <div class="pd-actions"><button class="btn primary" data-a="addgoal" ${a.earned || dup ? 'disabled' : ''}>${icon('plus')}Add to my goals</button>${a.earned ? '<span class="meta">You already have this.</span>' : dup ? '<span class="meta">Already one of your goals.</span>' : ''}</div>`;
        return h;
      }
    } else {
      h += `<span class="pill">${statIcon(stat)}${esc(statGroup(stat))}</span><h4>${esc(statLabel(stat))}</h4>`;
      if (STAT_BY_KEY[stat] && STAT_BY_KEY[stat].milestoneOnly) h += `<p class="desc">This grows on its own, so it works best as a lifetime target without a daily amount.</p>`;
    }

    h += `<div class="kv"><div><b>${value == null ? '–' : fmt(value)}</b>Your total</div>${avg != null ? `<div><b>${avg.toFixed(1)}</b>Recent daily pace</div>` : ''}${x ? `<div><b>${x.earned} / ${x.list.length}</b>Awards earned</div>` : ''}</div>`;
    if (value == null) h += `<div class="note">${icon('other')}<span>No value for this yet. It appears after the next check${STAT_BY_KEY[stat] ? '' : ', if the API has this stat'}.</span></div>`;
    h += drugHtml(stat, x, value);
    if (STAT_NOTE[stat]) h += `<div class="note">${icon('other')}<span>${esc(STAT_NOTE[stat])}</span></div>`;
    if (x) h += `<span class="lbl">Every award for this stat</span>` + pathHtml(stat, ms, a ? a.key : null);

    // Target options
    const opts = [];
    if (a) opts.push(['this', `This award: ${a.name}`, `Target ${fmt(a.threshold)}`]);
    if (x && x.next && (!a || x.top.key !== a.key)) opts.push(['top', `Top award: ${x.top.name}`, `Target ${fmt(x.top.threshold)}. Moves on as you earn each one.`]);
    if (!a) opts.push(['custom', 'My own number', '']);
    if (!a) opts.push(['none', 'No lifetime target', 'Daily amount only']);
    if (!opts.some((o) => o[0] === picker.target)) picker.target = opts[0][0];
    h += `<span class="lbl">Lifetime target</span><div class="opts">` + opts.map(([id, t, d]) => `<label class="opt"><input type="radio" name="p-target" value="${id}" ${picker.target === id ? 'checked' : ''}><span><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ''}${id === 'custom' ? `<input type="number" min="1" id="p-custom" value="${esc(picker.custom)}" placeholder="e.g. 1000">` : ''}</span></label>`).join('') + `</div>`;

    // Daily amount + suggestions
    const di = drugInfo(stat);
    const milestoneOnly = STAT_BY_KEY[stat] && STAT_BY_KEY[stat].milestoneOnly;
    h += `<span class="lbl">Per day</span><input type="number" min="0" id="p-daily" value="${picker.daily}" style="width:140px" aria-label="Per day">`;
    if (x && x.next && value != null && !milestoneOnly) {
      const target = picker.target === 'this' && a ? a.threshold : x.top.threshold;
      const rem = Math.max(0, target - value);
      const nextRem = Math.max(0, x.next.threshold - value);
      const s = [['Next award in 30 days', Math.ceil(nextRem / 30)], ['Target in 90 days', Math.ceil(rem / 90)], ['Target in a year', Math.ceil(rem / 365)]];
      if (avg) s.push(['Keep my recent pace', Math.max(1, Math.round(avg))]);
      if (di) { for (const o of s) if (o[1] > di.maxDay) o[1] = 0; s.push(['Every cooldown', di.minDay], ['Every cooldown, best case', di.maxDay]); }
      const seen = new Set();
      const chips = s.filter(([, n]) => n > 0 && !seen.has(n) && seen.add(n));
      if (chips.length) h += `<div class="sugg">${chips.map(([l, n]) => `<button data-a="setdaily" data-v="${n}">${l}: <b>${fmt(n)}</b></button>`).join('')}</div>`;
    }
    h += `<div class="eta" id="p-eta">${stat ? etaText(stat, state, ms, picker.daily) : ''}</div>`;

    const dup = a ? coveredBy(goals, a) : null;
    const dupText = dup ? (dup.award ? 'You already have a goal for this award.' : `Your ${goalLabel(dup)} goal already works towards this.`) : '';
    h += `<div class="pd-actions"><button class="btn primary" data-a="addgoal" ${a && a.earned ? 'disabled' : ''}>${icon('plus')}Add goal</button>${a && a.earned ? '<span class="meta">You already have this award.</span>' : dupText ? `<span class="meta">${esc(dupText)}</span>` : ''}</div>`;
    return h;
  }

  function openPicker(key) {
    tab = 'goals';
    picker.open = true;
    picker.search = '';
    picker.custom = '';
    if (key) selectPick(key, true);
    render();
  }

  function selectPick(key, silent) {
    picker.sel = key;
    const ms = getMilestones(loadState());
    const isStat = key.startsWith('stat:');
    const a = !isStat && ms ? ms.byId[key] : null;
    const stat = isStat ? key.slice(5) : a && a.stat;
    picker.target = a ? 'this' : ms && ms.stats[stat] && ms.stats[stat].next ? 'top' : 'none';
    // Suggest a daily amount that reaches the next award in about a month
    let daily = 0;
    if (stat && !(STAT_BY_KEY[stat] && STAT_BY_KEY[stat].milestoneOnly)) {
      const x = ms && ms.stats[stat];
      const value = statValue(loadState(), stat);
      const rem = x && x.next && value != null ? Math.max(0, x.next.threshold - value) : 0;
      daily = rem ? Math.max(1, Math.ceil(rem / 30)) : 1;
      const di = drugInfo(stat);
      if (di) daily = Math.min(daily, di.minDay);
    }
    picker.daily = daily;
    if (silent) return;
    // Update only the selection and the detail pane, so the list keeps its scroll.
    if (root.querySelectorAll) root.querySelectorAll('.pent').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pick === key)));
    const d = root.getElementById('p-detail');
    if (d) { d.innerHTML = pickerDetailHtml(buildCtx()); d.scrollTop = 0; }
  }

  function refreshPickerDetail() {
    const d = root.getElementById('p-detail');
    if (d) d.innerHTML = pickerDetailHtml(buildCtx());
  }

  function addPickedGoal() {
    const ms = getMilestones(loadState());
    const key = picker.sel;
    if (!key) return;
    const goals = loadGoals();
    const isStat = key.startsWith('stat:');
    const daily = Math.max(0, parseInt(picker.daily, 10) || 0);
    let g;
    if (isStat) {
      const stat = key.slice(5);
      g = { id: uid(), stat, daily, on: true, lifetime: null, auto: false };
      if (picker.target === 'top') g.auto = true;
      if (picker.target === 'custom') { const n = parseInt(picker.custom, 10); g.lifetime = n > 0 ? n : null; }
    } else {
      const a = ms && ms.byId[key];
      if (!a || a.earned) return;
      if (goals.some((x) => x.award && `${x.award.kind}:${x.award.id}` === key)) { toast('Already one of your goals'); return; }
      if (a.stat && picker.target === 'top') g = { id: uid(), stat: a.stat, daily, on: true, lifetime: null, auto: true };
      else g = { id: uid(), stat: a.stat || null, daily: a.stat ? daily : 0, on: true, lifetime: null, auto: false, award: { kind: a.kind, id: a.id, name: a.name } };
    }
    goals.push(g);
    saveGoals(goals);
    toast(`Goal added: ${goalLabel(g)}`);
    picker.open = false;
    tab = 'goals';
    refresh(true);
    render();
  }

  /* -------------------------------- History -------------------------------- */
  function historyHtml(ctx) {
    const { goals, state, ms } = ctx;
    const active = goals.filter((g) => g.on && g.daily > 0 && g.stat);
    let h = noticesHtml(state) + `<div class="ph"><div><h2>History</h2><p>The last 14 Torn days for each daily goal. Hover a day for the numbers.</p></div></div>`;
    if (!active.length) return h + `<div class="list"><div class="empty"><b>No daily goals yet</b>History builds up once a goal has a daily amount.</div></div>`;
    const now = Date.now();
    const days = [];
    for (let i = 13; i >= 0; i--) days.push(dayKey(now - i * DAY_MS));
    h += `<div class="legend"><span style="--c:var(--done)">Goal met</span><span style="--c:rgba(212,100,107,.5)">Missed</span><span style="--c:var(--soft)">No data</span><span style="--c:transparent">White dot: counted from part-way through the day</span></div><div class="list">`;
    for (const g of active) {
      const avg = avgDaily(state, g.stat);
      const met = days.filter((d) => { const x = doneOn(state, d, g.stat); return x != null && x >= g.daily; }).length;
      const st = streak(state, g);
      h += `<div class="hist"><div class="hist-h"><span class="st icon">${goalIcon(g, ms)}</span>
        <span class="t"><b>${esc(goalLabel(g))}</b><span>${fmt(g.daily)} a day. Met on ${met} of 14 days, average ${avg == null ? '–' : avg.toFixed(1)} a day.</span></span>
        ${st > 1 ? `<span class="pill brass">${icon('flame')}${st} days</span>` : '<span></span>'}</div>
        <div class="cells">${days.map((d) => {
          const x = doneOn(state, d, g.stat);
          const rec = state.days[d];
          const cls = x == null ? '' : x >= g.daily ? 'y' : 'n';
          const part = rec && x != null && !isExact(rec, g.stat) ? ' p' : '';
          return `<i class="${cls}${part}" title="${d}: ${x == null ? 'no data' : `${fmt(x)} of ${fmt(g.daily)}`}"></i>`;
        }).join('')}</div>
        <div class="cells-x"><span>${days[0].slice(8)}/${days[0].slice(5, 7)}</span><span>Today</span></div></div>`;
    }
    return h + `</div>`;
  }

  /* -------------------------------- Settings -------------------------------- */
  function settingsHtml(ctx) {
    const { settings, state } = ctx;
    const key = store.get('mh_key', '');
    const usingPda = !key && !!pdaKey();
    const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
    return noticesHtml(state) + `<div class="ph"><div><h2>Settings</h2><p>Your key and data stay on this device. The key is only ever sent to api.torn.com.</p></div></div>
      <h3>API key</h3>
      <div class="list"><div class="set wide"><div>
        <div class="keyrow"><input id="s-key" type="password" placeholder="Paste your Torn API key" value="${esc(key)}" aria-label="API key" autocomplete="off">
        <button class="btn primary" data-a="savekey">${key ? 'Save and test' : 'Save'}</button>${key ? '<button class="btn secondary" data-a="clearkey">Remove</button>' : ''}</div>
        <div class="keymsg ${usingPda ? 'ok' : ''}" id="s-keymsg">${usingPda ? 'Using the API key from Torn PDA. Paste a key here to use a different one.' : ''}</div>
        <span style="margin-top:8px">Medal Detector needs one <b style="display:inline;color:var(--text)">Limited</b> key for everything: stats, awards, gym, working stats, education and perks. <a class="link" href="${KEY_LINK}" target="_blank" rel="noopener">Create a Limited key for Medal Detector</a></span>
      </div></div></div>

      <h3>Checking for progress</h3>
      <div class="list">
        <div class="set"><div><b>Check every</b><span>It also checks on every page load, a few seconds after you click something in Torn, and when you come back to the tab. Torn's API can run up to about 30 seconds behind the game.</span></div>
          <select data-s="refreshSec" aria-label="Check every">${[[30, '30 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes']].map(([v, l]) => opt(v, l, refreshEveryMs(settings) / 1000)).join('')}</select></div>
        <div class="set"><div><b>Drug cooldown reduction</b><span>Only changes the drug estimates. Leave at 0% unless a perk shortens your drug cooldowns.</span></div>
          <input type="number" min="0" max="90" data-s="drugCdReduction" value="${settings.drugCdReduction || 0}" aria-label="Drug cooldown reduction in percent"></div>
      </div>

      <h3>Reminders</h3>
      <div class="list">
        <div class="set"><div><b>Remind me about unfinished daily goals</b><span>${IS_PDA ? "Not available in Torn PDA, which shows notifications as a pop-up box." : 'Sends a notification before the Torn day ends. Needs a Torn tab open; a background tab is fine.'}</span></div>
          <label class="check"><input type="checkbox" data-s="notify" ${settings.notify ? 'checked' : ''}> ${settings.notify ? 'On' : 'Off'}</label></div>
        <div class="set"><div><b>Hours before the day ends</b><span>When to send the reminder.</span></div>
          <input type="number" min="1" max="23" data-s="notifyHours" value="${settings.notifyHours}" aria-label="Hours before the day ends"></div>
      </div>

      <h3>Display</h3>
      <div class="list">
        <div class="set"><div><b>Open button</b><span>The sidebar row sits under Merits and lists your goals. On phones and in Torn PDA the floating button is always shown too.</span></div>
          <select data-s="button" aria-label="Open button">${opt('sidebar', 'Sidebar, under Merits', settings.button !== 'floating' ? 'sidebar' : 'floating')}${opt('floating', 'Floating button', settings.button === 'floating' ? 'floating' : 'sidebar')}</select></div>
        <div class="set"><div><b>Goals in the sidebar</b><span>List your goals under the Medal Detector row. Finished ones are hidden.</span></div>
          <label class="check"><input type="checkbox" data-s="sidebarGoals" ${settings.sidebarGoals !== false ? 'checked' : ''}> ${settings.sidebarGoals !== false ? 'Shown' : 'Hidden'}</label></div>
        <div class="set"><div><b>Floating button side</b><span>Used when the floating button is shown.</span></div>
          <select data-s="side" aria-label="Floating button side">${opt('right', 'Right', settings.side)}${opt('left', 'Left', settings.side)}</select></div>
      </div>

      <h3>Terms of service</h3>
      <div class="list"><table class="tos">
        <tr><td>Data Storage</td><td>Only locally (Tampermonkey storage on this device)</td></tr>
        <tr><td>Data Sharing</td><td>Nobody</td></tr>
        <tr><td>Purpose of Use</td><td>Personal gain: tracking your own goals and merit milestones</td></tr>
        <tr><td>Key Storage &amp; Sharing</td><td>Stored / Used only for automation (sent only to api.torn.com)</td></tr>
        <tr><td>Key Access Level</td><td>Limited (user: personalstats, profile, honors, medals, battlestats, workstats, education, perks; torn: honors, medals)</td></tr>
      </table></div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Events (UI only — nothing here touches the game page)              */
  /* ------------------------------------------------------------------ */
  function onClick(e) {
    if (e.target.dataset && e.target.dataset.backdrop) { togglePanel(); return; }
    const tabLink = e.target.closest('[data-tab-link]');
    if (tabLink) { e.preventDefault(); tab = tabLink.dataset.tabLink; picker.open = false; render(); return; }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; picker.open = false; expanded = null; render(); return; }
    const f = e.target.closest('[data-filter]');
    if (f) { awardView[f.dataset.kind].filter = f.dataset.filter; expanded = null; render(); return; }
    const pf = e.target.closest('[data-pfilter]');
    if (pf) { picker.filter = pf.dataset.pfilter; render(); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { selectPick(pick.dataset.pick); return; }
    const a = e.target.closest('[data-a]');
    if (a) {
      const act = a.dataset.a;
      if (act === 'toggle' || act === 'close') togglePanel();
      else if (act === 'refresh') { e.preventDefault(); refresh(true); render(); }
      else if (act === 'reloadcat') {
        e.preventDefault();
        ensureCatalogue(true).then(() => { toast('Award list updated'); refresh(true); }).catch((err) => { const st = loadState(); st.catError = err.message; saveState(st); render(); });
      }
      else if (act === 'goalfor') openPicker(a.dataset.key);
      else if (act === 'newgoal') { picker.sel = null; openPicker(null); }
      else if (act === 'closepicker') { picker.open = false; render(); }
      else if (act === 'addgoal') addPickedGoal();
      else if (act === 'setdaily') {
        picker.daily = parseInt(a.dataset.v, 10) || 0;
        const inp = root.getElementById('p-daily');
        if (inp) inp.value = picker.daily;
        updateEta();
      }
      else if (act === 'del') {
        const id = a.closest('[data-id]').dataset.id;
        const g = loadGoals().find((x) => x.id === id);
        saveGoals(loadGoals().filter((x) => x.id !== id));
        toast(`Deleted ${g ? goalLabel(g) : 'goal'}`);
        render();
      } else if (act === 'savekey') {
        const k = root.getElementById('s-key').value.trim();
        store.set('mh_key', k);
        const msg = root.getElementById('s-keymsg');
        msg.className = 'keymsg';
        msg.textContent = 'Testing…';
        fetchCurrent().then(() => { msg.className = 'keymsg ok'; msg.textContent = 'Key works.'; toast('API key saved'); refresh(true); })
          .catch((err) => { msg.className = 'keymsg bad'; msg.textContent = err.message; });
      } else if (act === 'clearkey') {
        store.set('mh_key', '');
        toast('API key removed');
        render();
      }
      return;
    }
    const ex = e.target.closest('[data-expand]');
    if (ex) { expanded = expanded === ex.dataset.expand ? null : ex.dataset.expand; render(); }
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'a-search') { awardView[t.dataset.kind].search = t.value; applySearch(); }
    else if (t.id === 'p-search') { picker.search = t.value; applySearch(); }
    else if (t.id === 'p-daily') { picker.daily = Math.max(0, parseInt(t.value, 10) || 0); updateEta(); }
    else if (t.id === 'p-custom') { picker.custom = t.value; }
  }

  function updateEta() {
    const el = root.getElementById('p-eta');
    if (!el || !picker.sel) return;
    const ms = getMilestones(loadState());
    const isStat = picker.sel.startsWith('stat:');
    const a = !isStat && ms ? ms.byId[picker.sel] : null;
    const stat = isStat ? picker.sel.slice(5) : a && a.stat;
    el.innerHTML = stat ? etaText(stat, loadState(), ms, picker.daily) : '';
  }

  function onKey(e) {
    if (!open || e.key !== 'Escape') return;
    if (picker.open) { picker.open = false; render(); return; }
    togglePanel();
  }

  // Add (or switch on) a goal that follows the top award for this stat.
  function trackStat(stat) {
    const goals = loadGoals();
    const existing = goals.find((g) => g.stat === stat && !g.award);
    if (existing) { existing.auto = true; existing.on = true; saveGoals(goals); return; }
    const s = STAT_BY_KEY[stat];
    let daily = 0;
    if (!s || !s.milestoneOnly) {
      const ms = getMilestones(loadState());
      const x = ms && ms.stats[stat];
      const remaining = x && x.next && x.value != null ? Math.max(0, x.next.threshold - x.value) : 0;
      daily = Math.max(1, Math.ceil(remaining / 30)); // pace to reach the next award in about a month
    }
    goals.push({ id: uid(), stat, daily, lifetime: null, auto: true, on: true });
    saveGoals(goals);
  }

  function onChange(e) {
    const t = e.target;
    if (t.id === 'p-hide') { picker.hideEarned = t.checked; render(); return; }
    if (t.name === 'p-target') { picker.target = t.value; refreshPickerDetail(); return; }
    if (t.dataset.f) {
      const id = t.closest('[data-id]').dataset.id;
      const goals = loadGoals();
      const g = goals.find((x) => x.id === id);
      if (!g) return;
      if (t.dataset.f === 'on') g.on = t.checked;
      else if (t.dataset.f === 'daily') g.daily = Math.max(0, parseInt(t.value, 10) || 0);
      else if (t.dataset.f === 'lifetime') g.lifetime = parseInt(t.value, 10) > 0 ? parseInt(t.value, 10) : null;
      saveGoals(goals);
      render();
      return;
    }
    if (t.dataset.s) {
      const s = loadSettings();
      const k = t.dataset.s;
      if (t.type === 'checkbox') s[k] = t.checked;
      else if (k === 'drugCdReduction') s[k] = Math.min(90, Math.max(0, parseInt(t.value, 10) || 0));
      else if (t.type === 'number') s[k] = Math.max(1, parseInt(t.value, 10) || DEFAULT_SETTINGS[k]);
      else s[k] = t.value;
      if (k === 'refreshSec') { s[k] = parseInt(t.value, 10) || 60; delete s.refreshMin; }
      if (k === 'notifyHours') s[k] = Math.min(23, s[k]);
      saveSettings(s);
      if (k === 'button') mountSidebar();
      if (k === 'sidebarGoals') sidebarGoalsHtml = null;
      toast('Saved');
      render();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Start                                                              */
  /* ------------------------------------------------------------------ */
  mount();
  // Every page load counts as "you did something": check now unless another tab just did.
  refreshSoon(0);
  // Timer: asks for a refresh when the shared cache is older than your chosen interval,
  // and keeps the countdown in the header ticking. It only ever calls api.torn.com.
  let ticks = 0;
  setInterval(() => { refresh(false); if (open && ++ticks % 6 === 0) render(true); }, 10000);
  // Screen size changes (e.g. rotating a phone) can switch the floating button on or off.
  try { window.addEventListener('resize', () => { clearTimeout(window.__mdResize); window.__mdResize = setTimeout(() => render(true), 200); }); } catch (e) { /* ignore */ }
  // Coming back to the tab: check again.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshSoon(0); });
  // After you click something in Torn (bust, use an item, attack...), check again a few seconds later.
  // We only LISTEN for your clicks; the script never clicks or sends anything to Torn itself.
  document.addEventListener('click', (e) => {
    if (host && e.composedPath && e.composedPath().includes(host)) return; // clicks inside our own panel
    if (e.target && e.target.closest && e.target.closest(`#${SIDEBAR_ID}, #${SIDEBAR_GOALS_ID}`)) return; // our sidebar row and goal list
    refreshSoon(4000);
  }, { capture: true, passive: true });
  try { GM_registerMenuCommand('Open Medal Detector', () => { open = true; render(); refresh(false); }); } catch (e) { /* ignore */ }

  // test hook (harmless in the browser)
  if (typeof window !== 'undefined' && window.__MH_TEST__) window.__MH_TEST__.api = { refresh, render, loadState, goalView, loadGoals, getMilestones, matchAward, trackStat, setOpen: (v, t) => { open = v; if (t) tab = t; }, setFilter: (f, kind = 'honors') => { awardView[kind].filter = f; }, setPick: (k) => { picker.open = true; tab = 'goals'; if (k) selectPick(k, true); }, setPickDaily: (n) => { picker.daily = n; }, setExpanded: (k) => { expanded = k; }, closePicker: () => { picker.open = false; }, addPickedGoal, isGoalDone, endSidebarWait: () => { sidebarWaitOver = true; }, refreshSoon, resetSidebar: () => { sidebarFound = false; sidebarWaitOver = false; }, drugInfo, etaText, rootRef: () => root };
})();
