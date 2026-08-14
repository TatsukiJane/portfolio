import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 работает со zod v4, а re-export `z` из 'astro:content' помечен
// устаревшим — поэтому импортируем zod напрямую.
import { z } from 'zod';

/*
 * Разметка страницы кейса — жёсткая сетка из двух колонок: слева заголовок
 * раздела, справа блоки содержимого. Поэтому содержимое описано полями
 * frontmatter, а не телом markdown: тело не отличило бы абзац от списка
 * с зелёными стрелками и не задало бы отступы макета.
 *
 * Блоки описаны фабрикой, а не константами: помощник image() существует
 * только внутри схемы коллекции, а экраны в слайдере — картинки.
 *
 * Новый кейс = новый .md в src/content/cases/ и картинки в src/assets/.
 */

/** Поля, общие для блоков с заголовком. */
const titledBlock = {
  title: z.string(),
  /**
   * Отступ от заголовка блока до содержимого, px. В макете он почти везде 8,
   * но у отдельных блоков разрядка больше — например у «Результата» 16,
   * а у блока с плиткой метрики 24.
   */
  titleGap: z.union([z.literal(8), z.literal(16), z.literal(24)]).default(8),
};

const caseBlocks = (image: SchemaContext['image']) => {
  /**
   * Ряд плиток с метриками: одна залитая зелёным, остальные светлые.
   * С заголовком плитки оборачиваются в текстовый блок — так в макете набран
   * итог шага, где плитка одна и занимает всю колонку.
   */
  const metricsBlock = z.object({
    type: z.literal('metrics'),
    title: z.string().optional(),
    titleGap: titledBlock.titleGap,
    items: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
          tone: z.enum(['solid', 'subtle']).default('subtle'),
        }),
      )
      .min(1),
  });

  /** Заголовок и один или несколько абзацев. */
  const textBlock = z.object({
    type: z.literal('text'),
    ...titledBlock,
    /**
     * Ключ термина, определение которого даёт этот блок. Так раздел
     * «Терминология» становится источником правды для подсказок: определение
     * берётся из первого абзаца, а в тексте на него ссылаются `[[ключ|слово]]`.
     */
    term: z.string().optional(),
    paragraphs: z.array(z.string()).min(1),
  });

  /** Заголовок и список с иконкой-маркером. */
  const listBlock = z.object({
    type: z.literal('list'),
    ...titledBlock,
    /**
     * star — серая искра, insight — жёлтая звезда (находки исследования),
     * success — зелёная стрелка вверх и зелёный текст, done — зелёная
     * галочка при обычном тексте («Что сработало»).
     */
    marker: z.enum(['star', 'insight', 'success', 'done']).default('star'),
    items: z.array(z.string()).min(1),
  });

  /**
   * Плашка-подсказка. В макете компонент зовётся TooltipBlock, но самого
   * тултипа в нём нет: это плашка про то, что термины дальше раскрываются
   * при наведении.
   */
  const noteBlock = z.object({
    type: z.literal('note'),
    title: z.string(),
    text: z.string(),
    /**
     * Определение, всплывающее при наведении на заголовок плашки. Плашка
     * рассказывает про подсказки у терминов — с этим полем она их и показывает.
     */
    definition: z.string().optional(),
  });

  /** Подзаголовок внутри раздела — например название шага. */
  const headingBlock = z.object({
    type: z.literal('heading'),
    text: z.string(),
    /**
     * Отступ перед подзаголовком. 80 — обычный шаг блоков, 160 — новый шаг
     * внутри раздела: в макете шаги «Решений» разведены как отдельные блоки,
     * но заголовок раздела у них один, поэтому в вёрстке это один раздел.
     */
    gapBefore: z.union([z.literal(80), z.literal(160)]).default(80),
  });

  /**
   * Слайдер с экранами приложения и подписями к ним. В макете —
   * CaseInfoSlider. Изображения тут только сами экраны: подписи, точки
   * и выделения собраны кодом, чтобы английскую версию не пришлось
   * перерисовывать.
   */
  const sliderBlock = z.object({
    type: z.literal('slider'),

    /** problem — красные подписи («было»), solution — зелёные («стало»). */
    tone: z.enum(['problem', 'solution']).default('problem'),

    /**
     * В макете слайдер стоит ближе к своему подзаголовку, чем блоки друг
     * к другу: 24 против обычных 80.
     */
    gapBefore: z.union([z.literal(24), z.literal(80)]).default(80),

    slides: z
      .array(
        z.object({
          /**
           * Заголовок слайда — по центру над экранами. В макете он нарисован
           * снаружи слота, то есть выглядит общим для слайдера, но у каждого
           * слайда «стало» в шаге «Подписание документа» он свой. Значит
           * заголовок принадлежит слайду и листается вместе с ним.
           */
          title: z.string().optional(),

          shots: z
            .array(
              z.object({
                /** Пока картинок нет, на месте экрана стоит заглушка с подписью. */
                src: image().optional(),
                alt: z.string(),
              }),
            )
            .min(1),

          /**
           * Подписи под экранами — по одной на экран. Пустая строка оставляет
           * место под своим экраном: в макете так набран слайд, где подпись
           * относится только к среднему экрану.
           */
          comments: z.array(z.string()).default([]),

          /**
           * Выделения поверх экранов: координаты и размер от левого верхнего
           * угла ряда экранов, как в макете.
           */
          highlights: z
            .array(
              z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number(),
              }),
            )
            .default([]),

          /**
           * Выноски: кривые линии от элемента одного экрана к другому,
           * экспортированные из макета как SVG. Система координат та же,
           * что у выделений; числа — рамка узла в макете, вынос обводки
           * экспорта компонент учитывает сам.
           */
          connectors: z
            .array(
              z.object({
                src: image(),
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number(),
              }),
            )
            .default([]),
        }),
      )
      .min(1),
  });

  return z.discriminatedUnion('type', [
    metricsBlock,
    textBlock,
    listBlock,
    noteBlock,
    headingBlock,
    sliderBlock,
  ]);
};

/** Раздел страницы кейса: заголовок в левой колонке, блоки в правой. */
const caseSection = (image: SchemaContext['image']) =>
  z.object({
    title: z.string(),

    /**
     * Тот же заголовок, разбитый на строки так, как он набран в макете.
     * Без него строка ломается сама — а в колонке 614 длинный заголовок
     * помещается целиком, хотя в макете он в две строки.
     */
    titleLines: z.array(z.string()).optional(),

    blocks: z.array(caseBlocks(image)).min(1),
  });

export type CaseBlock = z.infer<ReturnType<typeof caseBlocks>>;
export type CaseSection = z.infer<ReturnType<typeof caseSection>>;
export type CaseSliderBlock = Extract<CaseBlock, { type: 'slider' }>;

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),

      /**
       * Тот же заголовок, разбитый на строки так, как он набран в макете —
       * для H1 на странице кейса. Без него строка ломается сама.
       */
      titleLines: z.array(z.string()).optional(),

      /** Порядок на главной: чем меньше, тем выше. */
      order: z.number(),

      /**
       * Метрики результата — зелёные плашки под заголовком.
       * value — само число, label — что именно выросло.
       */
      metrics: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        )
        .default([]),

      /** Нейтральные метки, например платформа: «mobile». */
      tags: z.array(z.string()).default([]),

      /** Экраны в сером контейнере карточки. В макете их три. */
      shots: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
          }),
        )
        .default([]),

      /**
       * Содержимое страницы кейса. Пока разделов нет, страница не собирается:
       * пустой адрес не нужен ни в sitemap, ни в ссылках.
       */
      sections: z.array(caseSection(image)).default([]),

      /**
       * true — карточка помечена как заготовка: экраны в ней ещё не настоящие.
       * Пометка видна только в коде, на вид карточка обычная.
       */
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { cases };
