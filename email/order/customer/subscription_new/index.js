import pug from 'pug'
import client from '../../../../../lib/graphql'

const format_currency = (amount = 0) =>
   new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: process.env.CURRENCY
   }).format(amount)

const normalizeAddress = address => {
   if (!address) return ''
   let result = ''
   if (address.line1) result += `${address.line1}, `
   if (address.line2) result += `${address.line2}, `
   if (address.city) result += `${address.city}, `
   if (address.state) result += `${address.state}, `
   if (address.country) result += `${address.country}, `
   if (address.zipcode) result += `${address.zipcode}`
   return result
}

const email = async data => {
   try {
      const parsed = await JSON.parse(data)

      const { order } = await client.request(ORDER, {
         id: parsed.id
      })

      if (!order) throw 'No such order exists'

      const restaurant = {
         brand: {
            logo: {
               logoMark: ''
            },
            name: '',
            website: ''
         },
         address: '',
         contact: {
            phoneNo: '',
            email: ''
         }
      }
      if (order.source === 'subscription') {
         const { brand = {} } = await client.request(
            BRAND_SUBSCRIPTION_SETTING,
            {
               id: order.orderCart.brandId
            }
         )
         if ('brand' in brand) {
            restaurant.brand =
               brand.brand.length > 0 ? brand.brand[0].value : {}
         }
         if ('contact' in brand) {
            restaurant.contact =
               brand.contact.length > 0 ? brand.contact[0].value : {}
         }
         if ('address' in brand) {
            restaurant.address =
               brand.address.length > 0
                  ? normalizeAddress(brand.address[0].value)
                  : ''
         }
      }

      const plan = {
         title: '',
         itemCount: 0,
         serving: 0,
         deliveryDate: ''
      }

      if ('occurence' in order.orderCart && order.orderCart.occurence) {
         if (
            'fulfillmentDate' in order.orderCart.occurence &&
            order.orderCart.occurence.fulfillmentDate
         ) {
            plan.deliveryDate = new Intl.DateTimeFormat('en-US', {
               year: 'numeric',
               month: 'short',
               day: 'numeric'
            }).format(new Date(order.orderCart.occurence.fulfillmentDate))
         }
         if ('subscription' in order.orderCart.occurence) {
            if ('itemCount' in order.orderCart.occurence.subscription) {
               if (
                  'count' in order.orderCart.occurence.subscription.itemCount
               ) {
                  plan.itemCount =
                     order.orderCart.occurence.subscription.itemCount.count
               }
               if (
                  'serving' in order.orderCart.occurence.subscription.itemCount
               ) {
                  if (
                     'size' in
                     order.orderCart.occurence.subscription.itemCount.serving
                  ) {
                     plan.serving =
                        order.orderCart.occurence.subscription.itemCount.serving.size
                  }
                  if (
                     'plan' in
                     order.orderCart.occurence.subscription.itemCount.serving
                  ) {
                     if (
                        'title' in
                        order.orderCart.occurence.subscription.itemCount.serving
                           .plan
                     ) {
                        plan.title =
                           order.orderCart.occurence.subscription.itemCount.serving.plan.title
                     }
                  }
               }
            }
         }
      }

      const customer = {
         name: '',
         address: '',
         phone: '',
         email: ''
      }

      if ('customerFirstName' in order.dropoff) {
         customer.name = order.dropoff.customerFirstName || ''
      }
      if ('customerLastName' in order.dropoff) {
         customer.name += ` ${order.dropoff.customerLastName || ''}`
      }
      if ('customerEmail' in order.dropoff) {
         customer.email = order.dropoff.customerEmail
      }
      if ('customerAddress' in order.dropoff) {
         customer.address = normalizeAddress(order.dropoff.customerAddress)
      }
      if ('customerPhone' in order.dropoff) {
         customer.phone = order.dropoff.customerPhone || ''
      }

      const billing = {
         tax: format_currency(Number(order.tax) || 0),
         base: format_currency(Number(order.itemTotal) || 0),
         total: format_currency(Number(order.amountPaid) || 0),
         discount: format_currency(Number(order.discount) || 0),
         delivery: format_currency(Number(order.deliveryPrice) || 0),
         addOnTotal: format_currency(Number(order.orderCart.addOnTotal) || 0)
      }

      let products = []
      if (
         'products' in order.orderCart.cartInfo &&
         order.orderCart.cartInfo.products.length > 0
      ) {
         products = order.orderCart.cartInfo.products.map(node => ({
            ...node,
            ...(Boolean(node.addOnPrice) && {
               addOnPrice: format_currency(Number(node.addOnPrice) || 0)
            })
         }))
      }

      const compiler = await pug.compileFile(__dirname + '/index.pug')

      const response = await compiler({
         plan,
         billing,
         customer,
         products,
         restaurant,
         id: order.id,
         isTest: order.orderCart.isTest,
         transactionId: order.transactionId,
         paymentStatus: order.paymentStatus
      })
      return response
   } catch (error) {
      throw error
   }
}

export default email

const ORDER = `
   query order($id: oid!) {
      order(id: $id) {
         id
         tax
         source
         discount
         itemTotal
         created_at
         amountPaid
         paymentStatus
         transactionId
         deliveryPrice
         pickup: deliveryInfo(path: "pickup.pickupInfo")
         dropoff: deliveryInfo(path: "dropoff.dropoffInfo")
         orderCart {
            isTest
            cartInfo
            brandId
            addOnTotal
            occurence: subscriptionOccurence {
               fulfillmentDate
               subscription {
                  itemCount: subscriptionItemCount {
                     count
                     serving: subscriptionServing {
                        size: servingSize
                        plan: subscriptionTitle {
                           title
                        }
                     }
                  }
               }
            }
         }
      }
   }
`

export const BRAND_SUBSCRIPTION_SETTING = `
   query brand($id: Int!) {
      brand(id: $id) {
         brand: subscriptionStoreSettings(
            where: {
               subscriptionStoreSetting: { identifier: { _eq: "theme-brand" } }
            }
         ) {
            value
         }
         address: subscriptionStoreSettings(
            where: {
               subscriptionStoreSetting: { identifier: { _eq: "Location" } }
            }
         ) {
            value
         }
         contact: subscriptionStoreSettings(
            where: {
               subscriptionStoreSetting: { identifier: { _eq: "Contact" } }
            }
         ) {
            value
         }
      }
   }
`
