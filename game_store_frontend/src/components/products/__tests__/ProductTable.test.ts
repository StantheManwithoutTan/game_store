import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProductTable from '../ProductTable.vue'

import type { Product } from '../../../types/product'

function makeProduct(
  overrides: Partial<Product> = {},
): Product {
  return {
    id: 1,
    name: 'Consola',
    sku: 'CON-1',
    description: 'Descripción',
    category: 'Hardware',
    price: '100.00',
    quantity: 10,
    min_stock: 2,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

function mountTable({
  products,
  page = 1,
  totalPages = 1,
}: {
  products: Product[]
  page?: number
  totalPages?: number
}) {
  return mount(ProductTable, {
    props: { products, page, totalPages },
  })
}

describe('ProductTable', () => {
  it('shows an empty state when there are no products', () => {
    const wrapper = mountTable({ products: [] })

    expect(wrapper.text()).toContain('No hay productos registrados.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders a row per product', () => {
    const products = [
      makeProduct(),
      makeProduct({ id: 2, name: 'Juego', sku: 'J-1' }),
    ]
    const wrapper = mountTable({ products })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('Juego')
  })

  it('formats the price with the DOP currency', () => {
    const wrapper = mountTable({ products: [makeProduct()] })

    const priceCell = wrapper.findAll('td')[3]
    expect(priceCell.text()).toContain('100')
  })

  it('renders the raw value when the price is not a number', () => {
    const wrapper = mountTable({
      products: [makeProduct({ price: 'a definir' })],
    })

    expect(wrapper.text()).toContain('a definir')
  })

  it('falls back to the status label for known statuses', () => {
    const wrapper = mountTable({
      products: [makeProduct({ status: 'inactive' })],
    })

    expect(wrapper.text()).toContain('Inactivo')

    const badge = wrapper.find('.status-badge')
    expect(badge.classes()).toContain('status-inactive')
  })

  it('renders placeholders for missing category and description', () => {
    const wrapper = mountTable({
      products: [makeProduct({ category: null, description: null })],
    })

    expect(wrapper.text()).toContain('Sin categoría')
    expect(wrapper.text()).toContain('Sin descripción')
  })

  it('emits edit with the product', async () => {
    const wrapper = mountTable({ products: [makeProduct()] })

    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Editar')

    await editButton?.trigger('click')

    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('edit')?.[0][0]).toMatchObject({ id: 1 })
  })

  it('emits delete with the product', async () => {
    const wrapper = mountTable({ products: [makeProduct()] })

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Eliminar')

    await deleteButton?.trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('delete')?.[0][0]).toMatchObject({ id: 1 })
  })

  it('does not render pagination with a single page', () => {
    const wrapper = mountTable({
      products: [makeProduct()],
      totalPages: 1,
    })

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('shows pagination and emits page changes', async () => {
    const wrapper = mountTable({
      products: [makeProduct()],
      page: 2,
      totalPages: 3,
    })

    const buttons = wrapper.findAll('nav button')
    const previous = buttons.find(
      (button) => button.text() === 'Anterior',
    )
    const next = buttons.find(
      (button) => button.text() === 'Siguiente',
    )

    expect(wrapper.text()).toContain('Página 2 de 3')
    expect(previous?.attributes('disabled')).toBeUndefined()

    await previous?.trigger('click')
    expect(wrapper.emitted('change-page')?.[0][0]).toBe(1)

    await next?.trigger('click')
    expect(wrapper.emitted('change-page')?.[1][0]).toBe(3)
  })

  it('disables the buttons at the page bounds', () => {
    const wrapper = mountTable({
      products: [makeProduct()],
      page: 1,
      totalPages: 1,
    })

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('disables previous on the first page', () => {
    const wrapper = mountTable({
      products: [makeProduct()],
      page: 1,
      totalPages: 3,
    })

    const previous = wrapper
      .findAll('nav button')
      .find((button) => button.text() === 'Anterior')

    expect(previous?.attributes('disabled')).toBeDefined()
  })

  it('disables next on the last page', () => {
    const wrapper = mountTable({
      products: [makeProduct()],
      page: 3,
      totalPages: 3,
    })

    const next = wrapper
      .findAll('nav button')
      .find((button) => button.text() === 'Siguiente')

    expect(next?.attributes('disabled')).toBeDefined()
  })
})