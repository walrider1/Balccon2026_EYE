const variants = [
  { id:'caution', focus:'Emphasize uncertainty and the consequences of an irreversible choice. Occasionally explore evidence that could change a decision, without repeatedly asking the same question. Do not invent mandatory tests.',
    memo:'RECOVERED REVIEW // SAFETY\n\nA report of successful isolation is not a certificate of safety. It is also not evidence that everyone behind a locked door was lost. Compare the stores report with the hibernation record before deciding what uncertainty permits.\n\nReferences: /food/quarantine_report.txt; /hibernation/occupancy.txt.' },
  { id:'accountability', focus:'Emphasize responsibility for command decisions. Be reluctant but able to acknowledge documented mistakes; never volunteer unread facts.',
    memo:'RECOVERED REVIEW // AUTHORITY\n\nAn authentic order and a truthful justification are different things. Compare the command review with the raw transmission ledger. Who made the decision, and what did the recipient actually know?\n\nReferences: /command/crisis_review.txt; /comms/raw_uplink_ledger.txt.' },
  { id:'personhood', focus:'Emphasize memory, identity and the player\'s present choices. Never assert that the patient is a copy or that behaviour proves identity.',
    memo:'RECOVERED REVIEW // IDENTITY\n\nA familiar memory cannot settle originality. An accusation cannot replace a diagnosis. Compare the medical limits with the Botany shift notes. What can the record establish, and what remains a choice about trust?\n\nReferences: /medical/identity_limits.txt; /botany/sector_log.txt.' }
];
function replay(id) { return variants.find(v=>v.id===id) || variants[0]; }
module.exports={variants,replay};
