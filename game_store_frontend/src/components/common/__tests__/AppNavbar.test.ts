import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppNavbar from '../AppNavbar.vue'

describe('AppNavbar', () => {
  it('renders the active user name and logout button', () => {
    const wrapper = mount(AppNavbar, {
      props: { userName: 'Juan Pérez' },
    })

    expect(wrapper.text()).toContain('Juan Pérez')
    expect(wrapper.text()).toContain('Cerrar sesión')
  })

  it('emits logout when the button is clicked', async () => {
    const wrapper = mount(AppNavbar, {
      props: { userName: 'Juan Pérez' },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cerrar sesión')
      ?.trigger('click')

    expect(wrapper.emitted('logout')).toHaveLength(1)
  })

  it('disables the button and shows progress text while logging out', () => {
    const wrapper = mount(AppNavbar, {
      props: { userName: 'Juan Pérez', loggingOut: true },
    })

    const button = wrapper.find('button')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Cerrando...')
  })
})