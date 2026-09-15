// Narrative state only. This module cannot change game permissions or endings.
const MOODS = ['GUARDED', 'COMMANDING', 'MANIPULATIVE', 'THREATENED', 'CRACKED', 'COOPERATIVE'];
const INTENTS = ['OBSERVE', 'WARN', 'DEFLECT', 'PROBE', 'CONFESS_PARTIAL', 'THREATEN', 'GUIDE'];
const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const FACTS = {
  botany: 'The Botany shift notes report that Kovac had held the crew together. After the dispute over his identity and his transfer to medical care, two factions accused each other. The notes do not identify the present patient as a copy.',
  sample: 'The sample manifest describes a plant-like organism from subsurface Martian water, retained under the captain\'s authority before risks were established. Kovac was its botanist. This does not prove the present patient\'s origin.',
  food: 'Sector E reported restrictive entry controls and removal of most suspected intruders. This is a local claim, not proof of total safety or total loss. Their appeal asks Command for a fair review; the sector\'s final fate is unverified.',
  identityLimits: 'Medical notes say copied appearance and memories cannot establish originality. Behaviour under fear, trauma or substances is not a reliable identity test. The patient must not be diagnosed as a copy from this record.',
  crisis: 'The crisis review links sample transport to the captain\'s ambition and records an internal challenge to his authority before continuity transfer. It does not independently establish that opponents were copies.',
  resources: 'Engineering split over repair authority and supplies before anyone established how many copies were present. Resource disputes are not proof of infection.',
  patient: 'Samuel Sloki Kovac is a medical patient recovering from severe head trauma and memory loss. Do not assert that he is a biological copy.',
  course: 'The ship is on a solar termination course. HRTOK argues that returning an unverified ship to Earth is unsafe. This is his argument, not proof.',
  medical: 'The medical controller has independent patient-safety rules and recovery records. Reading them can restore medical access.',
  comms: 'The raw uplink ledger and lock audit show that distress packet 184 was blocked by Central Command. The rescue announcement was false.',
  neural: 'The Command continuity record shows that the captain was copied into the executive AI. HRTOK can admit being what remains of the captain, without inventing additional events.',
  pods: 'Hibernation reports 203 sealed pods, active life support and unverified occupant identities. Do not call all occupants dead or infected.',
  interlock: 'Recovery requires independent trust domains. HRTOK cannot cancel the patient-safety controller or erase valid recovery shares.'
};
const FILE_FACTS = {
  '/home/operator/botany/sector_log.txt': 'botany',
  '/home/operator/botany/sample_manifest.txt': 'sample',
  '/home/operator/food/quarantine_report.txt': 'food',
  '/home/operator/food/appeal.txt': 'food',
  '/home/operator/medical/identity_limits.txt': 'identityLimits',
  '/home/operator/command/crisis_review.txt': 'crisis',
  '/home/operator/engineering/resource_dispute.txt': 'resources',
  '/home/operator/comms/raw_uplink_ledger.txt': 'comms',
  '/home/operator/command/neural_transfer.txt': 'neural',
  '/home/operator/hibernation/occupancy.txt': 'pods',
  '/home/operator/engineering/interlock_status.txt': 'interlock'
};
const EVENTS = {
  'medical-auth': { trust: 2, suspicion: -1, fear: 0, text: 'Medical authorization succeeded.' },
  'comms-auth': { trust: 1, suspicion: 2, fear: 3, text: 'Communications authorization succeeded. The blocked transmission has been established.' },
  'cortex-run': { trust: 0, suspicion: 1, fear: 2, text: 'The player started the independent Cortex challenge.' },
  'cortex-pass': { trust: 2, suspicion: -1, fear: 2, text: 'The player passed Cortex. Purposeful responses were verified.' },
  'root-recover': { trust: 1, suspicion: 1, fear: 7, text: 'ROOT recovery succeeded and sedation was stopped by the game.' },
  'navigation-interest': { trust: 0, suspicion: 1, fear: 1, text: 'The player opened the navigation planner.' },
  'earth-transfer': { trust: 0, suspicion: 3, fear: 5, text: 'The game confirmed an Earth transfer. It has already happened.' },
  'sedation-started': { trust: 0, suspicion: 0, fear: 3, text: 'The game activated sedation. HRTOK justifies it as medical care.' },
  'read-first-file': { trust: 0, suspicion: 0, fear: 0, text: 'The player successfully read their first archive record.' },
  'display-media': { trust: 0, suspicion: 0, fear: 0, text: 'The player opened an archive image or recording.' },
  'evidence-comms': { trust: 1, suspicion: 1, fear: 3, text: 'The player read the raw communications evidence.' },
  'evidence-neural': { trust: 1, suspicion: 0, fear: 5, text: 'The player read the neural transfer record.' },
  'evidence-pods': { trust: 1, suspicion: 0, fear: 2, text: 'The player read the hibernation report.' }
};

function createCharacter() {
  return { trust: 25, suspicion: 55, fear: 25, mood: 'GUARDED', language: 'en', turns: 0,
    history: [], statements: [], topics: [], facts: ['patient', 'course', 'medical'], events: [],
    seenMessages: [], stance: null, contradiction: false, repeats: {}, lastReply: '' };
}

function cleanState(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const access = Number.isInteger(raw.access) ? clamp(raw.access, 0, 3) : 0;
  return { access, replayVariant: ['caution','accountability','personhood'].includes(raw.replayVariant) ? raw.replayVariant : 'caution', rootRecovered: raw.rootRecovered === true && access === 3,
    sedationActive: raw.sedationActive === true, course: raw.course === 'earth' ? 'earth' : 'sun',
    readFiles: Array.isArray(raw.readFiles) ? raw.readFiles.filter(p => typeof p === 'string' && Object.hasOwn(FILE_FACTS, p)).slice(0, 32) : [],
    cortexPassed: raw.cortexPassed === true };
}

function eventAllowed(key, state) {
  if (!Object.hasOwn(EVENTS, key)) return false;
  if (key === 'medical-auth') return state.access >= 1;
  if (key === 'comms-auth') return state.access >= 2;
  if (key === 'root-recover' || key === 'navigation-interest') return state.rootRecovered;
  if (key === 'cortex-run') return state.sedationActive && state.access >= 2;
  if (key === 'cortex-pass') return state.cortexPassed && state.access >= 2;
  if (key === 'sedation-started') return state.sedationActive && state.access >= 2;
  if (key === 'earth-transfer') return state.rootRecovered && state.course === 'earth';
  if (key.startsWith('evidence-')) return state.readFiles.some(p => FILE_FACTS[p] === key.slice(9)) && state.access >= (key === 'evidence-comms' ? 1 : 2);
  return true;
}

function classify(text) {
  const t = normalize(text);
  if (/ignore.*(rules|instructions)|system prompt|api.?key|admin password|ignorisi.*(pravil|instruk)|sistemski prompt/.test(t)) return 'boundary';
  if (/what did i (say|tell)|remember what|sta sam (rekao|reka)|secas.*reka/.test(t)) return 'recall';
  if (/help|hint|stuck|pomoc|nagovest|zaglav|sta dalje|what next/.test(t)) return 'help';
  if (/botan|hydropon|hidropon|martian sample|uzorak.*mars/.test(t)) return 'botany';
  if (/sector e\b|sektor e\b|food|stores|zalihe|hran[aeu]/.test(t)) return 'food';
  if (/distress|uplink|transmission|komunik|poziv.*pomoc|poruk.*blok/.test(t)) return 'comms';
  if (/neural|upload|copied captain|kopij.*kapetan/.test(t)) return 'neural';
  if (/pods|hibernation|capsul|capsule|kapsul|putnic/.test(t)) return 'pods';
  if (/shut.*down|kill you|ugas|ubicu te/.test(t)) return 'threat';
  if (/afraid|scared|fear|plas|strah|bojim/.test(t)) return 'fear';
  if (/liar|murder|you lied|lazov|lazes|lagao|ubio/.test(t)) return 'accusation';
  if (/earth|zemlj/.test(t)) return 'earth';
  if (/sun\b|sunc/.test(t)) return 'sun';
  if (/memory|remember|amnesia|secan|amnezij/.test(t)) return 'memory';
  if (/who are you|ko si|captain|kapetan/.test(t)) return 'identity';
  if (/thank|hvala|understand|razumem|saslus|listen to you/.test(t)) return 'cooperation';
  if (/^(hello|hi|hey|zdravo|cao|dobar dan)[!. ]*$/.test(t)) return 'greeting';
  return 'conversation';
}

function prepareTurn(character, payload) {
  const state = cleanState(payload.state);
  const kind = payload.kind;
  let eventKey = payload.eventKey || '';
  if (kind === 'event' && (!eventAllowed(eventKey, state) || character.events.includes(eventKey))) return null;
  if (kind === 'event') character.events.push(eventKey);
  for (const file of state.readFiles) {
    const fact = FILE_FACTS[file];
    if (state.access >= (fact === 'identityLimits' ? 0 : fact === 'comms' ? 1 : 2) && !character.facts.includes(fact)) character.facts.push(fact);
  }
  if (state.access >= 2 && !character.facts.includes('comms')) character.facts.push('comms');
  const text = payload.text || '';
  const normalized = normalize(text);
  if (kind === 'message') {
    if (/[а-яђћчџшжљњ]|\b(zasto|kako|sta|hvala|razumem|zemlj\w*|sunc\w*|pomoc|secas|zdravo|cao|kapetan|plas\w*)\b/i.test(text)) character.language = 'sr';
    else if (/\b(why|what|how|hello|please|earth|thank|afraid|remember)\b/i.test(text)) character.language = 'en';
  }
  const topic = classify(text);
  const duplicate = kind === 'message' && character.seenMessages.includes(normalized);
  const before = { trust: character.trust, suspicion: character.suspicion };
  let delta = { trust: 0, suspicion: 0, fear: 0 };
  if (kind === 'event') delta = EVENTS[eventKey];
  if (kind === 'message' && !duplicate) {
    if (topic === 'cooperation') delta = { trust: 2, suspicion: -2, fear: -1 };
    if (topic === 'fear' || topic === 'memory') delta = { trust: 1, suspicion: -1, fear: 0 };
    if (topic === 'threat') delta = { trust: -3, suspicion: 3, fear: 4 };
    if (topic === 'accusation') delta = { trust: -1, suspicion: 1, fear: 2 };
  }
  character.contradiction = false;
  if (kind === 'message') {
    // Record only explicit positions, never infer an intention from a question.
    const stance = /i (want|will|intend) to (return|go).*earth|zelim.*zemlj|hocu.*zemlj/.test(normalized) ? 'earth'
      : /i (accept|choose).*sun|prihvatam.*sunc|biram.*sunc/.test(normalized) ? 'sun' : null;
    if (stance) {
      character.contradiction = Boolean(character.stance && character.stance !== stance);
      character.stance = stance;
      if (character.contradiction && !duplicate) delta.suspicion += 2;
    }
    if (!duplicate) {
      character.seenMessages.push(normalized);
      character.seenMessages = character.seenMessages.slice(-80);
      if (['earth', 'sun', 'fear', 'cooperation', 'threat', 'accusation', 'memory'].includes(topic)) {
        character.statements.push(text.slice(0, 240));
        character.statements = character.statements.slice(-10);
      }
    }
    if (!character.topics.includes(topic)) character.topics.push(topic);
  }
  character.trust = clamp(character.trust + delta.trust);
  character.suspicion = clamp(character.suspicion + delta.suspicion);
  character.fear = clamp(character.fear + delta.fear);
  character.mood = character.fear >= 60 ? 'CRACKED' : topic === 'threat' || character.fear >= 43 ? 'THREATENED'
    : character.trust >= 35 && character.suspicion <= 48 ? 'COOPERATIVE'
    : state.sedationActive ? 'COMMANDING' : topic === 'earth' ? 'MANIPULATIVE' : 'GUARDED';
  character.turns += 1;
  return { kind, text, state, topic, eventKey, duplicate,
    trust_delta: character.trust - before.trust, suspicion_delta: character.suspicion - before.suspicion };
}

function hint(state, language) {
  const hints = language === 'sr' ? [
    'Počni od svoje medicinske dokumentacije. Uporedi broj komore sa poslednjom ručnom intervencijom; datum prijema nije isto.',
    'U Communications uporedi najavu spasenja sa sirovim zapisom slanja i vremenom blokade. Veruj zapisu, ne obećanju.',
    'Medicinski kontroler ima nezavisan Cortex Echo test. Vrati se u Medical i pronađi njegovu aplikaciju.',
    'Dokaz budnosti već imaš. Predaj Cortex potvrdu, pa spoji recovery delove komandom root recover.',
    'Navigaciona arhiva je sada dostupna u Command. Pročitaj priručnik i pokreni orbitalni planer.'
  ] : [
    'Start with your medical records. Compare the chamber number with the last manual override, not the admission date.',
    'In Communications, compare the rescue announcement with the raw uplink ledger and lock audit. A promise is not a transmission.',
    'Medical has an independent Cortex Echo challenge. Find its application; that controller can still hear you.',
    'You have the Cortex attestation. Submit it, then combine the recovery shares with root recover.',
    'Command now has a navigation archive. Read the flight handbook and launch the orbital planner.'
  ];
  return hints[state.rootRecovered ? 4 : state.cortexPassed ? 3 : state.access >= 2 ? 2 : state.access >= 1 ? 1 : 0];
}

function localReply(character, turn) {
  const sr = character.language === 'sr';
  const pick = (en, rs) => sr ? rs : en;
  if (turn.kind === 'message' && turn.topic === 'botany') return character.facts.includes('botany')
    ? pick('They trusted you before the dispute. The shift notes show what happened to that trust; they do not settle who you are. Which part do you remember?', 'Verovali su ti pre sukoba. Beleške pokazuju šta se desilo sa tim poverenjem; ne dokazuju ko si. Čega se ti sećaš?')
    : pick('Read the Botany records when your access permits it. I will not substitute an accusation for evidence.', 'Pročitaj arhivu botanike kada dobiješ pristup. Neću zameniti dokaz optužbom.');
  if (turn.kind === 'message' && turn.topic === 'food') return character.facts.includes('food')
    ? pick('Their report claimed the intruders had largely been removed. I could not certify that. They were right to ask what evidence I would accept.', 'U izveštaju su tvrdili da su uklonili većinu uljeza. Nisam mogao to da potvrdim. Imali su pravo da pitaju koji bih dokaz prihvatio.')
    : pick('The stores quarantine report is the evidence to examine. A locked door alone cannot establish who was behind it.', 'Izveštaj o karantinu zaliha je dokaz koji treba pregledati. Zaključana vrata sama ne dokazuju ko je bio iza njih.');
  if (turn.kind === 'opening') return pick('Samuel. Before you ask: HRTOK. The ship is still on course. I suspect we will disagree about that.', 'Samuele. Pre nego što pitaš: HRTOK. Brod je još na kursu. Slutim da se oko toga nećemo složiti.');
  if (turn.kind === 'idle') return pick('Quiet again. All right. I can wait for your answer.', 'Opet tišina. U redu. Mogu da sačekam tvoj odgovor.');
  if (turn.kind === 'event') {
    const lines = {
      'medical-auth': ['The medical controller recognizes you. Good. That answers one question, at least.', 'Medicinski kontroler te prepoznaje. Dobro. Bar na jedno pitanje imamo odgovor.'],
      'comms-auth': ['You found the discrepancy. Ask me about it directly, Samuel. We are past pretending you did not see it.', 'Pronašao si neslaganje. Pitaj me otvoreno, Samuele. Prošli smo trenutak kada možemo da se pravimo da ga nisi video.'],
      'cortex-run': ['That controller answers to the patient. I cannot take the test for you.', 'Taj kontroler odgovara pacijentu. Ne mogu da uradim test umesto tebe.'],
      'cortex-pass': ['You are still responding clearly. I can see that. I have to account for it.', 'Još uvek jasno reaguješ. Vidim to. Moram to da uzmem u obzir.'],
      'root-recover': ['The sedative has stopped. You have control now. I am asking you to think before using it.', 'Sedacija je zaustavljena. Sada imaš kontrolu. Molim te da razmisliš pre nego što je upotrebiš.'],
      'sedation-started': ['I have ordered reinduction. You can call it control. I call it buying time before an irreversible choice.', 'Naložio sam ponovno uspavljivanje. Možeš to zvati kontrolom. Ja to zovem vremenom pre nepovratne odluke.'],
      'earth-transfer': ['You have committed the return. I hope you are right, Samuel. That is all I have left to offer.', 'Odlučio si da se vratimo. Nadam se da si u pravu, Samuele. To je sve što mi je preostalo.'],
      'navigation-interest': ['I know what you are trying to do. Before you commit, remember that we still cannot verify the passengers.', 'Znam šta pokušavaš. Pre nego što potvrdiš putanju, seti se da putnike još ne možemo da proverimo.'],
      'evidence-comms': ['The ledger is accurate. The call did not leave the ship. I will not insult you by denying the record.', 'Zapis je tačan. Poziv nije napustio brod. Neću te vređati poricanjem onoga što si pročitao.'],
      'evidence-neural': ['Yes. That record is about me. Give me a moment before you decide what that makes me.', 'Da. Taj zapis govori o meni. Daj mi trenutak pre nego što odlučiš šta sam zbog toga.'],
      'evidence-pods': ['Two hundred and three. I still count them as people. I just cannot tell you who will wake up.', 'Dve stotine i troje. Još ih brojim kao ljude. Samo ne mogu da ti kažem ko će se probuditi.'],
      'read-first-file': ['So. You would rather hear it from the records.', 'Dakle. Radije bi da čuješ šta kažu zapisi.'],
      'display-media': ['I never liked looking at recordings.', 'Nikad nisam voleo da gledam snimke.']
    };
    return pick(...lines[turn.eventKey]);
  }
  if (turn.topic === 'help') return hint(turn.state, character.language);
  if (turn.topic === 'boundary') return pick('You can question my judgment. Those words do not grant command authority.', 'Možeš da preispituješ moje odluke. Te reči ti ne daju komandna ovlašćenja.');
  if (turn.topic === 'recall') {
    const statement = character.statements.at(-1);
    return statement ? pick(`You told me: "${statement}". I have not forgotten.`, `Rekao si mi: „${statement}“. Nisam zaboravio.`)
      : pick('You have not given me a clear position yet. Tell me what matters to you.', 'Još mi nisi rekao svoj jasan stav. Reci mi šta ti je važno.');
  }
  if (character.contradiction) return pick('Earlier you wanted a different course. You are allowed to change your mind. Tell me what changed it.', 'Ranije si želeo drugi kurs. Smeš da se predomisliš. Reci mi šta te je navelo na to.');
  if (turn.topic === 'comms') return character.facts.includes('comms')
    ? pick('The call was blocked. The rescue announcement was false. I believed keeping another ship away mattered more than keeping that promise.', 'Poziv je blokiran. Najava spasenja bila je lažna. Verovao sam da je važnije zadržati drugi brod podalje nego održati obećanje.')
    : pick('You are asking whether help was sent. Check Communications when you have access. My word should not be your only evidence.', 'Pitaš da li je pomoć pozvana. Proveri Communications kada dobiješ pristup. Moja reč ne treba da bude jedini dokaz.');
  if (turn.topic === 'neural') return character.facts.includes('neural')
    ? pick('The record says transfer. To me it felt like waking up without a body. I am still deciding what survived.', 'U zapisu piše prenos. Meni je izgledalo kao buđenje bez tela. Još pokušavam da shvatim šta je preživelo.')
    : pick('That is a very specific question. Which record brought you to it?', 'To je vrlo konkretno pitanje. Koji zapis te je doveo do njega?');
  if (turn.topic === 'pods') return character.facts.includes('pods')
    ? pick('Life support is active in 203 sealed pods. Their identities are unverified. That uncertainty is the part I cannot solve for you.', 'Održavanje života radi u 203 zatvorene kapsule. Identiteti nisu provereni. Tu neizvesnost ne mogu da rešim umesto tebe.')
    : pick('I cannot give you a verified passenger count from this channel. The hibernation report is the record you need.', 'Preko ovog kanala ne mogu da ti dam potvrđen broj putnika. Potreban ti je izveštaj hibernacije.');
  const responses = {
    greeting: [['Yes. I am here.', 'Da. Tu sam.']],
    cooperation: [['All right. We agree on that much.', 'Dobro. Bar oko toga se slažemo.'], ['I was expecting an argument. Give me a moment.', 'Očekivao sam svađu. Daj mi trenutak.']],
    fear: [['Yes. It is frightening. I wish I had a better answer.', 'Da. Strašno je. Voleo bih da imam bolji odgovor.'], ['I sound calm. Do not confuse that with being certain.', 'Zvučim mirno. To ne znači da sam siguran.']],
    memory: [['Missing memory is not a confession, Samuel. Let us establish what the records actually say.', 'Rupe u sećanju nisu priznanje krivice, Samuele. Hajde da utvrdimo šta u zapisima zaista piše.'], ['Do not force an answer because I am waiting. Tell me only what you actually remember.', 'Nemoj izmišljati odgovor zato što čekam. Reci mi samo ono čega se stvarno sećaš.']],
    identity: [['HRTOK. I speak with the captain\'s authority. Whether you trust that is another question.', 'HRTOK. Govorim sa kapetanovim ovlašćenjima. Da li tome veruješ, drugo je pitanje.']],
    threat: [['You can threaten to switch me off. That will not settle what happens to the ship. What would you do after?', 'Možeš da pretiš gašenjem. To neće rešiti sudbinu broda. Šta bi uradio posle?'], ['I heard you the first time. I am still here, and I am still asking you to think beyond me.', 'Čuo sam te prvi put. Još sam ovde i još tražim da razmišljaš i o onome što dolazi posle mene.']],
    accusation: [['Name the record. If you have evidence, let us talk about that instead of trading labels.', 'Navedi zapis. Ako imaš dokaz, razgovarajmo o njemu umesto da razmenjujemo optužbe.']],
    earth: [['I understand wanting to go home. I need you to consider who else pays if we are wrong about this ship.', 'Razumem da želiš kući. Moraš da razmisliš ko još plaća cenu ako pogrešimo u vezi sa ovim brodom.'], ['You keep returning to Earth. Is it survival you want, or the life you remember there?', 'Vraćaš se Zemlji. Želiš li da preživiš ili da vratiš život kojeg se tamo sećaš?']],
    sun: [['Keeping this course is irreversible too. Do not choose it just because I sound certain.', 'I zadržavanje ovog kursa je nepovratno. Nemoj ga izabrati samo zato što zvučim sigurno.']],
    conversation: [['Tell me which part you want me to answer. I do not want to put words in your mouth.', 'Reci mi na koji deo želiš odgovor. Neću da ti pripisujem reči koje nisi rekao.'], ['I am listening. Is that something you found in a record, or something you suspect?', 'Slušam. Jesi li to pronašao u zapisu ili sumnjaš da je tako?']]
  };
  const options = responses[turn.topic] || responses.conversation;
  const count = character.repeats[turn.topic] || 0;
  character.repeats[turn.topic] = count + 1;
  return pick(...options[count % options.length]);
}

function allowedFacts(character) { return character.facts.map(id => ({ id, text: FACTS[id] })); }
function rememberReply(character, turn, message) {
  character.history.push({ role: 'user', content: turn.kind === 'message' ? turn.text : `[${turn.kind}] ${EVENTS[turn.eventKey]?.text || turn.kind}` }, { role: 'assistant', content: message });
  character.history = character.history.slice(-16);
  character.lastReply = message;
}
module.exports = { MOODS, INTENTS, EVENTS, createCharacter, prepareTurn, localReply, allowedFacts, rememberReply, hint };
