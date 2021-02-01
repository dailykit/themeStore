import pug from 'pug'
import QR from 'qrcode'

import client from '../../../lib/graphql'

const label = async data => {
   try {
      const parsed = await JSON.parse(data)

      const { sachet = {} } = await client.request(SACHET, {
         id: parsed.id
      })

      const qrCode = await QR.toDataURL(
         JSON.stringify({
            type: 'sachet',
            sachet_id: parsed.id,
            product_id: sachet.orderProduct.id,
            order_id: sachet.orderProduct.orderId
         })
      )

      const compiler = await pug.compileFile(__dirname + '/index.pug')

      const response = await compiler({
         ...sachet,
         qrCode
      })
      return response
   } catch (error) {
      throw Error(error.message)
   }
}

export default label

const SACHET = `
   query sachet($id: Int!) {
      sachet: orderSachet(id: $id) {
         id
         unit
         quantity
         ingredient: ingredientName
         processing: processingName
         orderProduct: orderMealKitProduct {
            id
            orderId
            recipeProduct: simpleRecipeProduct {
               id
               name
            }
         }
      }
   }
`
