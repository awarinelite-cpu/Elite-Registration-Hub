import { downloadCsv } from '$lib/csv.js';

/** Example quiz text used by the "Use example" buttons. */
export const QUIZ_SAMPLE =
	'1. Which electrolyte is raised in renal failure?\nA. Sodium\nB. Potassium\nC. Calcium\nD. Chloride\nAnswer: B\n\n2. Select all signs of hypoglycaemia\nA. Sweating\nB. Tremors\nC. Polyuria\nAnswer: A, B';

/** Hands a file (or example) picked in the dashboard pop-up over to the quiz import page. */
export const handoff = { text: '', fileTitle: '' };
// a Word document chosen on the dashboard arrives in the note editor ready to preview
export const noteHandoff = { text: '', fileTitle: '' };

export function downloadQuizTemplate() {
	downloadCsv('quiz-template.csv', [
		['question', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'explanation', 'topic', 'marks', 'image'],
		['Which organ produces insulin?', 'Liver', 'Pancreas', 'Kidney', 'Spleen', 'B', 'Beta cells of the pancreas make insulin.', 'Physiology', '1', ''],
		['Which of these are vitamins? (select all that apply)', 'Vitamin C', 'Iron', 'Vitamin D', 'Calcium', 'A,C', 'Iron and calcium are minerals.', 'Nutrition', '2', ''],
		['Identify the structure shown in the picture.', 'Femur', 'Humerus', 'Tibia', 'Radius', 'A', '', 'Anatomy', '1', 'https://i.imgur.com/abc123.jpg']
	]);
}

/** File name -> readable quiz title. */
export const titleFromFile = (name) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
