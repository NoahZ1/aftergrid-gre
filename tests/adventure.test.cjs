const assert=require('node:assert/strict');const {Adventure,SECRETS,SITES}=require('../adventure-engine.js');
// Acknowledge study explanations automatically for existing story regressions.
const studyChoose=Adventure.prototype.choose;
Adventure.prototype.choose=function(id){const ok=studyChoose.call(this,id);if(this.studyFeedback)studyChoose.call(this,'continueStudy');return ok;};

function unlock(a){while(a.getChallenge()){assert(a.choose("answer0"));}}
function go(a,...actions){unlock(a);for(const id of actions){assert(a.chapter().choices.some(c=>c.id===id),`${a.scene} missing ${id}`);assert(a.choose(id));unlock(a);const c=a.chapter();assert(c.title&&c.body);assert(!c.body.includes('{planet}')&&!c.body.includes('{survivor}'));assert(c.choices.length>=1&&c.choices.length<=5);assert(SITES[a.scene]);}return a;}
const secrets=new Set(),biomes=new Set(),names=new Set(),endings=new Set();
for(let seed=1;seed<=150;seed++){
 const a=new Adventure(seed,seed%3);secrets.add(a.secretKey);biomes.add(a.planet.biome);names.add(a.planet.name);
 assert(!a.choose('invalid'));assert.equal(a.scene,'landing');
 go(a,'signal','aid','rescue','descend');assert.equal(a.scene,'core');assert(a.clues.length>=2);assert(a.trust>=2);
 const copy=Adventure.restore(a.serialize());assert.deepEqual(copy.chapter(),a.chapter());go(copy,'free');assert.equal(copy.scene,'ending');assert.equal(copy.ending.id,'restoration');endings.add(copy.ending.id);
 const b=new Adventure(seed);go(b,'monument','decode','fragment');assert.equal(b.scene,'observatory');assert(!b.chapter().choices.some(c=>c.id==='descend'));go(b,'witness','question','record','descend','free');assert.equal(b.ending.id,'fracture');endings.add(b.ending.id);
 const c=new Adventure(seed);go(c,'wreck','trail','listen');if(!c.chapter().choices.some(o=>o.id==='descend'))go(c,'wreck','record');go(c,'descend',seed%2?'protect':'reveal');endings.add(c.ending.id);assert(c.ending.text.length>150);
}
assert.equal(secrets.size,Object.keys(SECRETS).length);assert.equal(biomes.size,3);assert(names.size>40);assert.equal(endings.size,4);
const farm=new Adventure(73);go(farm,'signal','listen','wreck','trail','aid');assert.equal(farm.trust,1,'Revisiting a survivor cannot farm trust');
const seeded=new Adventure(44);assert.deepEqual(seeded.chapter(),new Adventure(44).chapter());assert.notEqual(new Adventure(44).planet.name,new Adventure(45).planet.name);
assert.throws(()=>Adventure.restore('{"version":1}'));
console.log('PASS: 150 procedural expeditions, 4 central mysteries, 3 biomes, evidence gates, survivor trust, 4 endings, branches, save/restore and repeat-choice protection.');
for(let seed=1;seed<=60;seed++){
 const campaigns=[0,1,2].map(f=>new Adventure(seed,f));
 assert.equal(new Set(campaigns.map(a=>a.chapter().body)).size,3);
 assert.equal(new Set(campaigns.map(a=>a.secretKey)).size,3);
 assert.equal(new Set(campaigns.map(a=>a.chapter().choices[0].label)).size,3);
 for(const a of campaigns){go(a,'signal','aid','rescue','descend','free');assert.equal(a.ending.id,'restoration');assert.deepEqual(Adventure.restore(a.serialize()).chapter(),a.chapter());}
}
console.log('PASS: civilization-specific premises, choices, distinct mysteries, endings and saves across 60 seeds.');

for(let faction=0;faction<3;faction++){
 const a=new Adventure(191,faction);assert(!a.choose('signal'),'Cannot bypass landing puzzle');
 assert(a.choose('answer1'));assert.equal(a.integrity,2);assert.equal(a.scene,'landing');
 a.choose('answer0');assert(a.choose('signal'));assert(a.getChallenge(),'Next stage is locked');
 const copy=Adventure.restore(a.serialize());assert.equal(copy.integrity,2);assert(copy.getChallenge());
 copy.choose('answer1');copy.choose('answer2');assert.equal(copy.ending.id,'lost');assert(!copy.choose('answer0'));
 const fighter=new Adventure(191,faction);go(fighter,'signal','aid','rescue');
 fighter.choose('descend');assert.equal(fighter.scene,'battle');assert(!fighter.choose('free'));
 fighter.choose('answer1');assert.equal(fighter.integrity,2);assert.equal(fighter.combatRound,0);
 fighter.choose('answer0');fighter.choose('answer0');
 const saved=Adventure.restore(fighter.serialize());assert.equal(saved.combatRound,2);
 saved.choose('answer0');assert.equal(saved.scene,'core');assert(saved.enemyDefeated);assert(saved.getChallenge());
 saved.choose('answer0');assert(saved.choose('free'));assert.equal(saved.ending.id,'restoration');
 const lost=new Adventure(71,faction);lost.scene='battle';lost.visited.push('battle');
 lost.choose('answer2');lost.choose('answer1');lost.choose('answer2');assert.equal(lost.ending.id,'lost');
}
console.log('PASS: puzzle gates, trap damage, three distinct guardians, combat counters, defeat, victory and mid-fight saves.');

Adventure.prototype.choose=studyChoose;
const quiz=new Adventure(191,0),question=quiz.getChallenge();assert(question.type&&question.explanation);assert(question.answers.length>=4);
assert(quiz.choose('answer1'));assert(quiz.studyFeedback);assert.equal(quiz.study.attempts,1);assert.equal(quiz.study.correct,0);assert.equal(quiz.integrity,2);assert(!quiz.choose('answer0'));
assert.equal(quiz.chapter().choices[0].id,'continueStudy');const restoredQuiz=Adventure.restore(quiz.serialize());assert.deepEqual(restoredQuiz.chapter(),quiz.chapter());
quiz.choose('continueStudy');quiz.choose('answer0');assert(quiz.studyFeedback.correct);assert.equal(quiz.study.correct,1);quiz.choose('continueStudy');assert(!quiz.getChallenge());
const bank=require('../gre-questions.js').GREQuestions;assert.equal(bank.length,24);for(const q of bank){assert(q.answers.length>=4&&q.answers.length<=5);assert.equal(new Set(q.answers).size,q.answers.length);assert(q.explanation.length>50);}
assert.equal(1.2*0.8,0.96);assert.equal(3/5*2/4,3/10);assert.equal(5*18-64,26);assert.equal(9*(15-9),54);assert.equal(1/(1/6+1/3),2);assert.equal(40/8*3,15);
console.log('PASS: GRE bank structure, explanations, feedback acknowledgment, review history, saved feedback and quantitative answer calculations.');
const deckA=new Adventure(17),deckB=new Adventure(18);deckA.setQuestionDeck([]);deckB.setQuestionDeck([]);
assert.equal(new Set(deckA.questionDeck).size,24);assert.notDeepEqual(deckA.questionDeck,deckB.questionDeck);
const used=deckA.questionDeck.slice(0,11),fresh=new Adventure(19);fresh.setQuestionDeck(used);assert(fresh.questionDeck.slice(0,13).every(i=>!used.includes(i)));
assert.deepEqual(Adventure.restore(fresh.serialize()).questionDeck,fresh.questionDeck);
const exhausted=new Adventure(20);exhausted.setQuestionDeck(Array.from({length:24},(_,i)=>i));assert.equal(new Set(exhausted.questionDeck).size,24);
console.log('PASS: shuffled decks, unseen priority, no duplicate questions within a deck, deck persistence and exhausted-bank cycling.');
