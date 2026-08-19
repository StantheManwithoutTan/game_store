import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProductToolbar from '../ProductToolbar.vue'

describe('ProductToolbar', () => {
  it('renders the current search value', () => {
    const wrapper = mount(ProductToolbar, {
      props: { modelValue: 'consola' },
    })

    const input = wrapper.find('#product-search')
    expect(input.element.value).toBe('consola')
  })

  it('emits update:modelValue and search when typing', async () => {
    const wrapper = mount(ProductToolbar, {
      props: { modelValue: '' },
    })

    const input = wrapper.find('#product-search')
    await input.setValue('nuevo filtro')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toBe(
      'nuevo filtro',
    )
    expect(wrapper.emitted('search')).toHaveLength(1)
  })

  it('emits create when the create button is clicked', async () => {
    const wrapper = mount(ProductToolbar, {
      props: { modelValue: '' },
    })

    const button = wrapper
      .findAll('button')
      .find((element) => element.text() === 'Nuevo producto')

    await button?.trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
  })
})