import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Field, Label } from '@/components/manage/ManageFormField'

describe('CatalogFormField', () => {
  it('renders catalog labels without an external context provider', () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(
          Field,
          null,
          createElement(Label, null, 'Aktivite suresi'),
          createElement('input', { name: 'duration' }),
        ),
      ),
    ).not.toThrow()
  })
})
