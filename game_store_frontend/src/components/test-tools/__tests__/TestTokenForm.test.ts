import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TestTokenForm from '../TestTokenForm.vue'

describe('TestTokenForm', () => {
  function mountForm({ generating = false } = {}) {
    return mount(TestTokenForm, {
      props: { generating },
    })
  }

  function checkedRoleValues(wrapper: ReturnType<typeof mount>) {
    return wrapper
      .findAll('input[type="checkbox"]')
      .filter((input) => (input.element as HTMLInputElement).checked)
      .map((input) => (input.element as HTMLInputElement).value)
  }

  it('renders all the available roles', () => {
    const wrapper = mountForm()

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(8)
    expect(wrapper.text()).toContain('Ver productos')
    expect(wrapper.text()).toContain('Gestionar juegos')
  })

  it('preselects the view permissions and the default duration', () => {
    const wrapper = mountForm()

    expect(checkedRoleValues(wrapper)).toEqual([
      'product:view',
      'stock:view',
    ])
    expect(
      (wrapper.find('#token-expiration').element as HTMLSelectElement).value,
    ).toBe('15')
  })

  it('emits generate with the selected roles and duration', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('generate')?.[0][0]).toEqual({
      roles: ['product:view', 'stock:view'],
      expires_minutes: 15,
    })
  })

  it('includes newly checked roles in the generated request', async () => {
    const wrapper = mountForm()

    const checkbox = wrapper.findAll('input[type="checkbox"]')[4]
    const input = checkbox.element as HTMLInputElement

    input.checked = true
    await checkbox.trigger('change')

    await wrapper.find('form').trigger('submit')

    const emitted = wrapper.emitted('generate')?.[0][0] as {
      roles: string[]
    }

    expect(emitted.roles).toContain('game:view')
    expect(emitted.roles).toContain('product:view')
  })

  it('emits the selected duration when it changes', async () => {
    const wrapper = mountForm()

    await wrapper.find('#token-expiration').setValue('60')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('generate')?.[0][0]).toEqual({
      roles: ['product:view', 'stock:view'],
      expires_minutes: 60,
    })
  })

  it('disables the button and shows progress text while generating', () => {
    const wrapper = mountForm({ generating: true })

    expect(wrapper.text()).toContain('Generando...')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})