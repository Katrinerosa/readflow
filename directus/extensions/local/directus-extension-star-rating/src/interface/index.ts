import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
  id: 'star-rating',
  name: 'Star Rating',
  icon: 'star',
  description: 'Rate items using stars',
  component: InterfaceComponent,
  types: ['integer', 'float'],
  group: 'selection',
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
      field: 'allowHalf',
      name: 'Allow Half Stars',
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
  ],
  recommendedDisplays: ['star-rating-display'],
});
