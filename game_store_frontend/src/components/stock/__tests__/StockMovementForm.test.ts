import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StockMovementForm from '../StockMovementForm.vue'

import type { Product } from '../../../types/product'
import type { StockMovementForm as FormModel } from '../../../types/stock'

function makeProduct(
  overrides: Partial<Product> = {},
): Product {
  return {
    id: 1,
    name: 'Consola',
    sku: 'CON-1',
    description: null,
    category: null,
    price: '100.00',
    quantity: 10,
    min_stock: 2,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

function formModel(
  overrides: Partial<FormModel> = {},
): FormModel {
  return {
    productId: 1,
    type: 'entrada',
    value: 1,
    motive: '',
    ...overrides,
  }
}

function mountForm({
  products = [makeProduct(), makeProduct({ id: 2, name: 'Juego' })],
  selectedProduct,
  modelValue = formModel(),
  valueLabel = 'Cantidad',
  submitting = false,
}: {
  products?: Product[]
  selectedProduct?: Product
  modelValue?: FormModel
  valueLabel?: string
  submitting?: boolean
} = {}) {
  return mount(StockMovementForm, {
    props: {
      products,
      selectedProduct,
      modelValue,
      valueLabel,
      submitting,
    },
  })
}

describe('StockMovementForm', () => {
  it('renders the product options and the placeholder', () => {
    const wrapper = mountForm()

    const options = wrapper.findAll('#movement-product option')
    expect(options).toHaveLength(3)
    expect(wrapper.text()).toContain('Selecciona un producto')
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('Juego')
  })

  it('renders the value label for the active movement type', () => {
    const wrapper = mountForm({ valueLabel: 'Cantidad a ingresar' })

    expect(wrapper.text()).toContain('Cantidad a ingresar')
  })

  it('shows the selected product stock when provided', () => {
    const wrapper = mountForm({
      selectedProduct: makeProduct(),
    })

    expect(wrapper.text()).toContain('Stock actual')
    expect(wrapper.text()).toContain('Stock mínimo')
  })

  it('emits an update when a product is selected', async () => {
    const wrapper = mountForm()

    await wrapper.find('#movement-product').setValue('2')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      productId: 2,
    })
  })

  it('emits an update when the movement type changes', async () => {
    const wrapper = mountForm()

    const radio = wrapper.findAll('input[type="radio"]')[1]
    const input = radio.element as HTMLInputElement

    input.checked = true
    await radio.trigger('change')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      type: 'salida',
    })
  })

  it('emits a numeric update for the value field', async () => {
    const wrapper = mountForm()

    await wrapper.find('#movement-value').setValue('5')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      value: 5,
    })
  })

  it('emits an update for the motive', async () => {
    const wrapper = mountForm()

    await wrapper.find('#movement-motive').setValue('reposición')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      motive: 'reposición',
    })
  })

  it('emits submit on form submit', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('disables the submit button and shows progress text while submitting', () => {
    const wrapper = mountForm({ submitting: true })

    expect(wrapper.text()).toContain('Registrando...')
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('disables the submit button when there are no products', () => {
    const wrapper = mountForm({ products: [] })

    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeDefined()
  })
})