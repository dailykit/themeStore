import pug from 'pug'
import QR from 'qrcode'
import client from '../../../lib/graphql'

const PRODUCT = `
   query product($id: Int!) {
      product: orderReadyToEatProduct(id: $id) {
         id
         orderId
         combo: comboProduct {
            name
         }
         component: comboProductComponent {
            label
         }
         recipe: simpleRecipeProduct {
            name
         }
         option: simpleRecipeProductOption {
            yield: simpleRecipeYield {
               serving: yield(path: "serving")
            }
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
            type: 'ready_to_eat',
            product_id: parsed.id,
            order_id: product.orderId
         })
      )

      let name = product.recipe.name
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
         serving: product.option.yield.serving
      })
      return response
   } catch (error) {
      throw Error(error.message)
   }
}

export default label
