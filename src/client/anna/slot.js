/**
 * „Bauchgefühl“: ein Glücksspielautomat für den Wochenplan.
 * Statt logisch auszuwählen, wählt man eine Stimmung und lässt die Walzen entscheiden.
 */
import { mealsApi } from '../js/api.js';
import { loadMealsIntoPlan } from '../js/plan.js';
import { SLOT, pick } from './phrases.js';

const MOODS = [
  { id: 0, label: '🎲 Egal' },
  { id: 1, label: '🍃 Schnell & leicht' },
  { id: 2, label: '🍲 Wohlfühl-Klassiker' },
  { id: 3, label: '✨ Heute wird gezaubert' },
];

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** @param {{effects: object, mascot: object}} deps */
export function createSlot({ effects, mascot }) {
  let meals = [];
  let mood = 0;
  let result = [];
  let spinning = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  // ---------- Aufbau ----------
  const dialog = node('dialog', 'modal anna-slot');
  dialog.setAttribute('aria-labelledby', 'anna-slot-title');
  const content = node('div', 'modal-content');
  const title = node('h2', '', '🎰 Bauchgefühl');
  title.id = 'anna-slot-title';
  const intro = node('p', 'slot-intro', SLOT.intro);

  const moodRow = node('div', 'slot-moods');
  moodRow.setAttribute('role', 'group');
  moodRow.setAttribute('aria-label', 'Stimmung');
  const moodButtons = MOODS.map((entry) => {
    const button = node('button', 'slot-mood', entry.label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(entry.id === mood));
    button.addEventListener('click', () => {
      mood = entry.id;
      moodButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(MOODS[i].id === mood)));
    });
    return button;
  });
  moodRow.append(...moodButtons);

  const reels = node('div', 'slot-reels');
  const reelTexts = [0, 1, 2].map(() => {
    const reel = node('div', 'slot-reel');
    const text = node('span', 'slot-text', '🍽️');
    reel.append(text);
    reels.append(reel);
    return text;
  });

  const message = node('p', 'slot-message');
  message.setAttribute('role', 'status');

  const actions = node('div', 'modal-actions');
  const spinButton = node('button', 'btn btn-primary', '🎰 Dreh!');
  spinButton.type = 'button';
  const takeButton = node('button', 'btn btn-success', '💕 Das nehm ich!');
  takeButton.type = 'button';
  takeButton.disabled = true;
  const closeButton = node('button', 'btn btn-secondary', 'Schließen');
  closeButton.type = 'button';
  actions.append(spinButton, takeButton, closeButton);

  content.append(title, intro, moodRow, reels, message, actions);
  dialog.append(content);
  document.body.append(dialog);

  // ---------- Ablauf ----------
  function stopTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  }

  async function spin() {
    if (spinning) return;
    try {
      meals = await mealsApi.list();
    } catch (err) {
      message.textContent = `Hoppla: ${err.message}`;
      return;
    }
    if (meals.length === 0) {
      message.textContent = SLOT.empty;
      return;
    }

    const filtered = mood ? meals.filter((m) => m.difficulty === mood) : meals;
    const pool = filtered.length > 0 ? filtered : meals;
    message.textContent = filtered.length > 0 ? pick(SLOT.spinning) : 'Dazu hab ich nichts – ich nehme einfach alles 🙈';
    result = shuffle(pool).slice(0, 3);
    spinning = true;
    spinButton.disabled = true;
    takeButton.disabled = true;
    reelTexts.forEach((text, i) => {
      text.parentElement.classList.remove('landed');
      text.parentElement.hidden = i >= result.length;
    });
    mascot.setMood('oh', 4200);

    // Walzen laufen nacheinander aus: schneller Wechsel, der gegen Ende langsamer wird.
    result.forEach((meal, reelIndex) => {
      const stopAt = 1300 + reelIndex * 750;
      let elapsed = 0;
      const tick = () => {
        const progress = elapsed / stopAt;
        if (progress >= 1) {
          land(reelIndex, meal);
          return;
        }
        reelTexts[reelIndex].textContent = pick(meals).name;
        reelTexts[reelIndex].parentElement.classList.add('rolling');
        const delay = 70 + progress * progress * 260;
        elapsed += delay;
        later(tick, delay);
      };
      tick();
    });
  }

  function land(index, meal) {
    const reel = reelTexts[index].parentElement;
    reelTexts[index].textContent = meal.name;
    reel.classList.remove('rolling');
    reel.classList.add('landed');
    effects.burstAtElement(reel, { emojis: ['✨', '💖', '⭐'], count: 8, dots: 8, spread: 80 });
    if (index === result.length - 1) {
      spinning = false;
      spinButton.disabled = false;
      spinButton.textContent = '🔄 Nochmal!';
      takeButton.disabled = false;
      message.textContent = pick(SLOT.done);
      mascot.setMood('happy', 3000);
    }
  }

  function take() {
    if (result.length === 0) return;
    loadMealsIntoPlan(result);
    dialog.close();
    mascot.say(SLOT.taken, { mood: 'happy' });
    effects.rain(['🍽️', '💖', '✨'], 1800, 120);
  }

  function open() {
    stopTimers();
    spinning = false;
    result = [];
    spinButton.disabled = false;
    spinButton.textContent = '🎰 Dreh!';
    takeButton.disabled = true;
    message.textContent = '';
    reelTexts.forEach((text) => {
      text.textContent = '🍽️';
      text.parentElement.hidden = false;
      text.parentElement.classList.remove('landed', 'rolling');
    });
    dialog.showModal();
  }

  spinButton.addEventListener('click', spin);
  takeButton.addEventListener('click', take);
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', stopTimers);

  // Button in der Werkzeugleiste des Wochenplans
  const entry = node('button', 'btn btn-secondary anna-slot-btn', '🎰 Bauchgefühl');
  entry.type = 'button';
  entry.addEventListener('click', open);
  document.querySelector('#tab-weekly-plan .toolbar')?.prepend(entry);

  function dispose() {
    stopTimers();
    if (dialog.open) dialog.close();
    dialog.remove();
    entry.remove();
  }

  return { dispose };
}
