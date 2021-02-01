import pug from 'pug'
import QR from 'qrcode'
import client from '../../../lib/graphql'

const PRODUCT = `
   query product($id: Int!) {
      product: orderInventoryProduct(id: $id) {
         id
         orderId
         quantity
         combo: comboProduct {
            name
         }
         component: comboProductComponent {
            label
         }
         inventory: inventoryProduct {
            id
            name
         }
         option: inventoryProductOption {
            label
            quantity
         }
      }
   }
`

const label = async data => {
   try {
      const parsed = await JSON.parse(data)

      const { product = {} } = await client.request(PRODUCT, {
         id: parsed.id
      })

      const qrCode = await QR.toDataURL(
         JSON.stringify({
            type: 'inventory',
            product_id: parsed.id,
            order_id: product.orderId
         })
      )

      let name = product.inventory.name
      if (product.combo) {
         name += ` - ${product.combo.name} `
      }
      if (product.component) {
         name += `(${product.component.label})`
      }

      const compiler = await pug.compileFile(__dirname + '/index.pug')

      const response = await compiler({
         qrCode,
         name,
         product: { id: product.id },
         order: { id: product.orderId },
         quantity: `${product.quantity * product.option.quantity} x ${
            product.option.label
         }`
      })
      return response
   } catch (error) {
      throw Error(error.message)
   }
}

export default label
