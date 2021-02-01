import pug from 'pug'

import client from '../../../lib/graphql'

const kot = async data => {
   try {
      const {
         order: { id = '' } = {},
         station = { ids: [] }
      } = await JSON.parse(data)

      const { order = {} } = await client.request(ORDER, {
         id,
         ...(station.ids.length && { packingStationId: { _in: station.ids } })
      })

      let stationName = null

      const mealkits = order.orderMealKit.nodes.map(node => {
         const object = {
            name: '',
            sachets: {}
         }
         if (node.simpleRecipeProductId) {
            object.name += node.simpleRecipeProduct.name
         }
         if (node.comboProductId) {
            object.name += ` - ${node.comboProduct.name}`
         }
         if (node.comboProductComponentId) {
            object.name += ` (${node.comboProductComponent.label})`
         }

         object.sachets = {
            count: node.sachets.aggregate.count,
            list: node.sachets.nodes.map(item => {
               const data = {
                  ...item,
                  supplier: {
                     name: 'N/A',
                     item: {
                        name: 'N/A'
                     }
                  },
                  packaging: { name: 'N/A' },
                  ...(item.stationId && { station: item.station.name }),
                  quantity: `${item.quantity}${item.unit}`
               }
               if (station.ids.length === 1) {
                  stationName = item.station.name
               }
               if (item.packagingId) {
                  data.packaging.name = item.packaging.name
               }
               if (item.sachetItemId) {
                  if (item.sachetItem.bulkItemId) {
                     if (item.sachetItem.bulkItem.supplierItemId) {
                        data.supplier.item.name =
                           item.sachetItem.bulkItem.supplierItem.name
                        if (item.sachetItem.bulkItem.supplierItem.unitSize) {
                           data.supplier.item.name += ` - ${item.sachetItem.bulkItem.supplierItem.unitSize}${item.sachetItem.bulkItem.supplierItem.unit}`
                        }
                        if (item.sachetItem.bulkItem.supplierItem.supplierId) {
                           data.supplier.name =
                              item.sachetItem.bulkItem.supplierItem.supplier.name
                        }
                     }
                  }
               } else if (item.bulkItemId) {
                  if (item.bulkItem.supplierItemId) {
                     data.supplier.item.name = item.bulkItem.supplierItem.name
                     if (item.bulkItem.supplierItem.unitSize) {
                        data.supplier.item.name += ` - ${item.bulkItem.supplierItem.unitSize}${item.bulkItem.supplierItem.unit}`
                     }
                     if (item.bulkItem.supplierItem.supplierId) {
                        data.supplier.name =
                           item.bulkItem.supplierItem.supplier.name
                     }
                  }
               }
               return data
            })
         }

         return object
      })

      const compiler = await pug.compileFile(__dirname + '/index.pug')

      const readyBy =
         order.readyByTimestamp &&
         new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
         }).format(new Date(order.readyByTimestamp))

      const fulfillmentType = capitalize(
         capitalize(order.fulfillmentType.split('_').join(' '), true)
      )

      const response = await compiler({
         id,
         readyBy,
         mealkits,
         stationName,
         fulfillmentType,
         customer: order.customer
      })

      return response
   } catch (error) {
      console.log('error', error)
      throw Error(error.message)
   }
}

export default kot

const capitalize = (str, lower = false) =>
   (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match =>
      match.toUpperCase()
   )

const ORDER = `
   query order($id: oid!, $packingStationId: Int_comparison_exp) {
      order(id: $id) {
         fulfillmentType
         readyByTimestamp
         customer: deliveryInfo(path: "dropoff.dropoffInfo")
         orderMealKit: orderMealKitProducts_aggregate(
            where: { orderSachets: { packingStationId: $packingStationId } }
         ) {
            aggregate {
               count(columns: id)
            }
            nodes {
               id
               quantity
               simpleRecipeProductId
               simpleRecipeProduct {
                  id
                  name
               }
               comboProductId
               combo: comboProduct {
                  id
                  name
               }
               comboProductComponentId
               component: comboProductComponent {
                  id
                  label
               }
               simpleRecipeProductOptionId
               recipeOption: simpleRecipeProductOption {
                  id
                  yield: simpleRecipeYield {
                     serving: yield(path: "serving")
                  }
               }
               sachets: orderSachets_aggregate(where: {packingStationId: $packingStationId}) {
                  aggregate {
                     count(columns: id)
                  }
                  nodes {
                     id
                     unit
                     quantity
                     ingredient: ingredientName
                     processing: processingName
                     packingStationId
                     stationId: packingStationId
                     station: packingStation {
                        name
                     }
                     packagingId
                     packaging {
                        name
                     }
                     sachetItemId
                     sachetItem {
                        bulkItemId
                        bulkItem {
                           supplierItemId
                           supplierItem {
                              name
                              unit
                              unitSize
                              supplierId
                              supplier {
                                 name
                              }
                           }
                        }
                     }
                     bulkItemId
                     bulkItem {
                        supplierItemId
                        supplierItem {
                           name
                           unit
                           unitSize
                           supplierId
                           supplier {
                              name
                           }
                        }
                     }
                  }
               }
            }
         }
      }
   }
`
