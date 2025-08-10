import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  rules: {
    'vue/attribute-hyphenation': 'off', // Disable since TresJS relies on camelCase attributes
  },
  ignores: [
    '**/fixtures',
  ],
})
