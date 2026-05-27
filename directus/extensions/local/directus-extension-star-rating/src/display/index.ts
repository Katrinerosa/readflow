import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';

export default defineDisplay({
  id: 'star-rating-display',
  name: 'Star Rating',
  icon: 'star',
  description: 'Display ratings as stars',
  component: DisplayComponent,
  types: ['integer', 'float'],
  options: [
    {
      field: 'maxStars',
      name: 'Maximum Stars',
      type: 'integer',
      meta: {
        interface: 'input',
        width: 'half',
        options: {
          placeholder: '5',
        },
      },
      schema: {
        default_value: 5,
      },
    },
    {
      field: 'color',
      name: 'Star Color',
      type: 'string',
      meta: {
        interface: 'select-color',
        width: 'half',
      },
      schema: {
        default_value: '#f59e0b',
      },
    },
    {
      field: 'emptyColor',
      name: 'Empty Star Color',
      type: 'string',
      meta: {
        interface: 'select-color',
        width: 'half',
      },
      schema: {
        default_value: '#d1d5db',
      },
    },
    {
      field: 'showValue',
      name: 'Show Numeric Value',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
      },
      schema: {
        default_value: false,
      },
    },
    {
      field: 'size',
      name: 'Star Size',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        width: 'half',
        options: {
          choices: [
            { text: 'Small', value: 'small' },
            { text: 'Medium', value: 'medium' },
            { text: 'Large', value: 'large' },
          ],
        },
      },
      schema: {
        default_value: 'small',
      },
    },
  ],
});
