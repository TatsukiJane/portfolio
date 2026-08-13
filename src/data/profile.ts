/*
 * Все данные о владельце сайта — в одном месте.
 *
 * ВНИМАНИЕ: ссылки ниже — заглушки. Замени их на настоящие,
 * иначе кнопки в hero и футере будут вести в никуда.
 * Файл резюме положи в public/ и укажи путь в cvUrl.
 */

export interface ExperienceEntry {
  company: string;
  note: string;
  role: string;
  period: string;
}

export const profile = {
  name: 'Толеген Айбек',
  headline: 'Продуктовый дизайнер для комплексных продуктов',
  /**
   * Тот же заголовок, разбитый на строки так, как он набран в макете.
   * Автоматический перенос ставит его иначе, а разбивка здесь заметно
   * влияет на композицию первого экрана.
   */
  headlineLines: ['Продуктовый дизайнер', 'для комплексных продуктов'],
  description:
    'Продуктовый дизайнер: работаю с комплексными B2B SaaS-продуктами — ' +
    'от анализа воронки до готового интерфейса.',

  /** Ключевые слова вокруг фото в hero. */
  tags: ['b2b', 'mobile', 'web', 'saas'],

  experience: [
    {
      company: 'Documentolog',
      note: '№1 в цифровизации документооборота',
      role: 'Product Designer',
      period: '2023 — по наст. время',
    },
    {
      company: 'Intermedia',
      note: 'Веб-студия',
      role: 'UX/UI дизайнер',
      // Диапазон лет — короткое тире без пробелов (в макете стоял дефис).
      period: '2021–2023',
    },
  ] satisfies ExperienceEntry[],

  links: {
    telegram: 'https://t.me/TatsukiJane',
    linkedin: 'https://www.linkedin.com/in/tatsukijane/',
    /*
     * Резюме лежит на Google Drive: обновляется без пересборки сайта, но
     * открывается через просмотрщик Drive и работает, только пока файл
     * доступен по ссылке всем. Чтобы отвязаться от Drive — положить PDF
     * в public/ и указать здесь '/cv.pdf'.
     */
    cv: 'https://drive.google.com/file/d/1So8FVywlMDWmhjTqqlUq4xhW8rzZAmWw/view?usp=drive_link',
  },
} as const;
