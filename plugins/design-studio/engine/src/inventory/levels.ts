/** The atomic levels a component can sit at, from the lowest to the highest. */
export type Level = 'layout' | 'atom' | 'molecule' | 'organism' | 'template' | 'page';
export const RANK: Record<Level, number> = { layout: 0, atom: 1, molecule: 2, organism: 3, template: 4, page: 5 };
export const LEVELS: readonly Level[] = ['layout', 'atom', 'molecule', 'organism', 'template', 'page'];
