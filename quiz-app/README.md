# Quiz Night

A cinematic, fully functional quiz app built with plain HTML5, CSS3, and vanilla JavaScript — no frameworks, no build step, no dependencies.

## Live Demo

[View Quiz Night](https://danya-musbah.github.io/100-Days-100-Projects/quiz-app/)


## Features

- Category and difficulty selection, with question-count (5/10/15/20) and optional timer (none, 5, 10, 15 min)
- Multiple-choice questions with shuffled question order and shuffled answer order per attempt
- Previous/Next navigation that preserves every answer, plus a compact question navigator
- Live progress bar, question counter, and countdown timer with a visual low-time warning
- Toast feedback after each question, a circular score reveal, and a results screen with accuracy, correct/incorrect counts, and time taken
- Full answer review with your answer, the correct answer, and an explanation for every question
- Locally saved statistics (quizzes completed, best score, average score, questions answered) with a confirm-before-reset dialog
- Keyboard shortcuts: `1`–`4` to pick an answer, `Enter` to advance, `Escape` to close dialogs
- Responsive from 320px phones to large desktop screens; respects `prefers-reduced-motion`

## Structure

```text
quiz-app/
├── index.html          Entry point — open this
├── css/style.css        Midnight Botanical design system
├── js/script.js         Application logic and state
├── data/questions.js    60-question bank across 8 categories
├── images/favicon.svg   Custom moon + leaf favicon
└── README.md
```


## Data model

Each question in `data/questions.js` follows:

```js
{
  id: 1,
  category: "Science",
  difficulty: "medium",
  question: "What is the powerhouse of the cell?",
  options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"],
  answer: 2,
  explanation: "Mitochondria generate most of the cell's ATP."
}
```

