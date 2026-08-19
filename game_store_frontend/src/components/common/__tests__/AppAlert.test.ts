import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppAlert from '../AppAlert.vue'

describe('AppAlert', () => {
  it('renders the slot content with the default type', () => {
    const wrapper = mount(AppAlert, {
      slots: { default: 'Producto guardado' },
    })

    expect(wrapper.classes()).toContain('app-alert')
    expect(wrapper.classes()).toContain('app-alert-info')
    expect(wrapper.text()).toBe('Producto guardado')
    expect(wrapper.attributes('role')).toBe('alert')
  })

  it('applies the success type class', () => {
    const wrapper = mount(AppAlert, {
      props: { type: 'success' },
    })

    expect(wrapper.classes()).toContain('app-alert-success')
  })

  it('applies the error type class', () => {
    const wrapper = mount(AppAlert, {
      props: { type: 'error' },
    })

    expect(wrapper.classes()).toContain('app-alert-error')
  })

  it('applies the warning type class', () => {
    const wrapper = mount(AppAlert, {
      props: { type: 'warning' },
    })

    expect(wrapper.classes()).toContain('app-alert-warning')
  })
})