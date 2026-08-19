import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProductModal from '../ProductModal.vue'

import type { Product, ProductFormData } from '../../../types/product'

function formData(
  overrides: Partial<ProductFormData> = {},
): ProductFormData {
  return {
    name: '',
    sku: '',
    description: '',
    category: '',
    price: 0,
    quantity: 0,
    min_stock: 0,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

const product: Product = {
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
}

function mountModal({
  product: productProp = null,
  form = formData(),
  submitting = false,
}: {
  product?: Product | null
  form?: ProductFormData
  submitting?: boolean
} = {}) {
  return mount(ProductModal, {
    props: {
      product: productProp,
      form,
      submitting,
    },
    global: {
      stubs: { ProductForm: true },
    },
  })
}

describe('ProductModal', () => {
  it('renders the create title when there is no product', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Nuevo producto')
  })

  it('renders the edit title when there is a product', () => {
    const wrapper = mountModal({ product })

    expect(wrapper.text()).toContain('Editar producto')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mountModal({ product })

    await wrapper.find('.modal-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop is clicked directly', async () => {
    const wrapper = mountModal({ product })

    await wrapper.find('.modal-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when a child of the backdrop is clicked', async () => {
    const wrapper = mountModal({ product })

    await wrapper.find('.modal-content').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('forwards the form update to update:form', () => {
    const wrapper = mountModal()

    const form = wrapper.findComponent({ name: 'ProductForm' })

    form.vm.$emit('update:modelValue', formData({ name: 'Nuevo' }))

    expect(wrapper.emitted('update:form')).toHaveLength(1)
    expect(wrapper.emitted('update:form')?.[0][0]).toMatchObject({
      name: 'Nuevo',
    })
  })

  it('forwards submit as save', () => {
    const wrapper = mountModal()

    const form = wrapper.findComponent({ name: 'ProductForm' })

    form.vm.$emit('submit')

    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('forwards cancel as close', () => {
    const wrapper = mountModal()

    const form = wrapper.findComponent({ name: 'ProductForm' })

    form.vm.$emit('cancel')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})