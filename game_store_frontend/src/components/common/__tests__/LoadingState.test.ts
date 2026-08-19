import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LoadingState from '../LoadingState.vue'

describe('LoadingState', () => {
  it('renders the default message', () => {
    const wrapper = mount(LoadingState)

    expect(wrapper.text()).toContain('Cargando...')
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('renders a custom message', () => {
    const wrapper = mount(LoadingState, {
      props: { message: 'Consultando el servidor...' },
    })

    expect(wrapper.text()).toContain('Consultando el servidor...')
  })
})