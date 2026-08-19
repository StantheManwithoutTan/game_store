import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ProductForm from '../ProductForm.vue'

import type { ProductFormData } from '../../../types/product'

function formData(
  overrides: Partial<ProductFormData> = {},
): ProductFormData {
  return {
    name: 'Consola',
    sku: 'CON-1',
    description: 'Descripción',
    category: 'Hardware',
    price: 100,
    quantity: 10,
    min_stock: 2,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

function mountForm({
  form = formData(),
  editing = false,
  submitting = false,
}: {
  form?: ProductFormData
  editing?: boolean
  submitting?: boolean
} = {}) {
  return mount(ProductForm, {
    props: { modelValue: form, editing, submitting },
  })
}

describe('ProductForm', () => {
  it('renders the current form values', () => {
    const wrapper = mountForm()

    const inputs = {
      name: wrapper.find('#product-name').element as HTMLInputElement,
      sku: wrapper.find('#product-sku').element as HTMLInputElement,
      description: wrapper.find('#product-description').element as HTMLTextAreaElement,
      category: wrapper.find('#product-category').element as HTMLInputElement,
    }

    expect(inputs.name.value).toBe('Consola')
    expect(inputs.sku.value).toBe('CON-1')
    expect(inputs.description.value).toBe('Descripción')
    expect(inputs.category.value).toBe('Hardware')
  })

  it('emits updates while typing in text fields', async () => {
    const wrapper = mountForm()

    await wrapper.find('#product-name').setValue('Nueva consola')
    await wrapper.find('#product-description').setValue('Nueva desc')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      name: 'Nueva consola',
    })
    expect(wrapper.emitted('update:modelValue')?.[1][0]).toMatchObject({
      description: 'Nueva desc',
    })
  })

  it('emits numeric updates for the numeric fields', async () => {
    const wrapper = mountForm()

    await wrapper.find('#product-price').setValue('250.5')
    await wrapper.find('#product-quantity').setValue('3')
    await wrapper.find('#product-min-stock').setValue('4')

    const emitted = wrapper.emitted('update:modelValue') ?? []

    expect(emitted[0][0]).toMatchObject({ price: 250.5 })
    expect(emitted[1][0]).toMatchObject({ quantity: 3 })
    expect(emitted[2][0]).toMatchObject({ min_stock: 4 })
  })

  it('disables the SKU field while editing', () => {
    const wrapper = mountForm({ editing: true })

    expect(
      (wrapper.find('#product-sku').element as HTMLInputElement).disabled,
    ).toBe(true)
  })

  it('emits an update when the status changes', async () => {
    const wrapper = mountForm()

    await wrapper.find('#product-status').setValue('inactive')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      status: 'inactive',
    })
  })

  it('emits an update when the critical stock checkbox changes', async () => {
    const wrapper = mountForm()

    const checkbox = wrapper.find('input[type="checkbox"]')
    const input = checkbox.element as HTMLInputElement

    input.checked = true
    await checkbox.trigger('change')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      critico_stock: true,
    })
  })

  it('chooses the button label based on the editing state', () => {
    const createWrapper = mountForm()
    expect(createWrapper.text()).toContain('Crear producto')

    const editWrapper = mountForm({ editing: true })
    expect(editWrapper.text()).toContain('Actualizar producto')
  })

  it('shows a progress label and disables buttons while submitting', () => {
    const wrapper = mountForm({ submitting: true })

    expect(wrapper.text()).toContain('Guardando...')

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })

  it('emits submit on form submit and cancel on the cancel button', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancelar')
      ?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})