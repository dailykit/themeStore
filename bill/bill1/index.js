import pug from 'pug'
import client from '../../../lib/graphql'

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
   if (address.zipcode) result += `${address.zipcode}, `
   return result
}

const bill = async data => {
   try {
      const parsed = await JSON.parse(data)

      const { order } = await client.request(ORDER, {
         id: parsed.id.toString()
      })

      const settings = {
         brand: {
            name: ''
         },
         address: {
            lat: '',
            lng: '',
            city: '',
            line1: '',
            line2: '',
            state: '',
            country: '',
            zipcode: ''
         },
         contact: {
            phoneNo: '',
            email: ''
         }
      }
      if (order.orderCart.cartSource === 'a-la-carte') {
         const { brand } = await client.request(BRAND_ON_DEMAND_SETTING, {
            id: order.orderCart.brandId
         })
         if (brand) {
            if (brand.brand.length > 0) {
               settings.brand.name = brand.brand[0].name || ''
            }
            if (brand.contact.length > 0) {
               settings.contact.email = brand.contact[0].email || ''
               settings.contact.phoneNo = brand.contact[0].phoneNo || ''
            }
            if ('address' in brand) {
               settings.address.line1 = brand.address[0].line1 || ''
               settings.address.line2 = brand.address[0].line2 || ''
               settings.address.city = brand.address[0].city || ''
               settings.address.state = brand.address[0].state || ''
               settings.address.country = brand.address[0].country || ''
               settings.address.zipcode = brand.address[0].zipcode || ''
               settings.address.lat = brand.address[0].lat || ''
               settings.address.lng = brand.address[0].lng || ''
            }
         }
      } else if (order.orderCart.cartSource === 'subscription') {
         const { brand } = await client.request(BRAND_SUBSCRIPTION_SETTING, {
            id: order.orderCart.brandId
         })
         if (brand) {
            if (brand.brand.length > 0) {
               settings.brand.name = brand.brand[0].name || ''
            }
            if (brand.contact.length > 0) {
               settings.contact.email = brand.contact[0].email || ''
               settings.contact.phoneNo = brand.contact[0].phoneNo || ''
            }
            if ('address' in brand) {
               settings.address.line1 = brand.address[0].line1 || ''
               settings.address.line2 = brand.address[0].line2 || ''
               settings.address.city = brand.address[0].city || ''
               settings.address.state = brand.address[0].state || ''
               settings.address.country = brand.address[0].country || ''
               settings.address.zipcode = brand.address[0].zipcode || ''
               settings.address.lat = brand.address[0].lat || ''
               settings.address.lng = brand.address[0].lng || ''
            }
         }
      }

      const {
         customerPhone,
         customerAddress
      } = order.deliveryInfo.dropoff.dropoffInfo

      const compiler = await pug.compileFile(__dirname + '/index.pug')

      const response = await compiler({
         id: parsed.id,
         customerPhone: customerPhone,
         restaurant: settings.brand.name,
         orgPhone: settings.contact.phoneNo,
         tax: format_currency(Number(order.tax) || 0),
         orgAddress: normalizeAddress(settings.address),
         customerAddress: normalizeAddress(customerAddress),
         discount: format_currency(Number(order.discount) || 0),
         itemTotal: format_currency(Number(order.itemTotal) || 0),
         amountPaid: format_currency(Number(order.amountPaid) || 0),
         deliveryPrice: format_currency(Number(order.deliveryPrice) || 0),
         items: [
            ...order.orderMealKitProducts.map(product => ({
               title: product.simpleRecipeProduct.name,
               price: format_currency(Number(product.price) || 0)
            })),
            ...order.orderInventoryProducts.map(product => ({
               title: product.inventoryProduct.name,
               price: format_currency(Number(product.price) || 0)
            })),
            ...order.orderReadyToEatProducts.map(product => ({
               title: product.simpleRecipeProduct.name,
               price: format_currency(Number(product.price) || 0)
            }))
         ]
      })
      return response
   } catch (error) {
      throw Error(error.message)
   }
}

export default bill

const ORDER = `
   query order($id: oid!) {
      order(id: $id) {
         id
         tax
         discount
         currency
         itemTotal
         created_at
         amountPaid
         deliveryInfo
         deliveryPrice
         orderCart {
            cartSource
            brandId
         }
         orderInventoryProducts {
            price
            inventoryProduct {
               name
            }
         }
         orderReadyToEatProducts {
            price
            simpleRecipeProduct {
               name
            }
         }
         orderMealKitProducts {
            price
            simpleRecipeProduct {
               name
            }
         }
      }
   }
`

const BRAND_ON_DEMAND_SETTING = `
   query brand($id: Int!) {
      brand(id: $id) {
         brand: onDemandSettings(
            where: { onDemandSetting: { identifier: { _eq: "Brand Name" } } }
         ) {
            name: value(path: "name")
         }
         address: onDemandSettings(
            where: { onDemandSetting: { identifier: { _eq: "Location" } } }
         ) {
            lat: value(path: "lat")
            lng: value(path: "lng")
            city: value(path: "city")
            line1: value(path: "line1")
            line2: value(path: "line2")
            state: value(path: "state")
            country: value(path: "country")
            zipcode: value(path: "zipcode")
         }
         contact: onDemandSettings(
            where: { onDemandSetting: { identifier: { _eq: "Contact" } } }
         ) {
            email: value(path: "email")
            phoneNo: value(path: "phoneNo")
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
            name: value(path: "name")
         }
         address: subscriptionStoreSettings(
            where: {
               subscriptionStoreSetting: { identifier: { _eq: "Location" } }
            }
         ) {
            lat: value(path: "lat")
            lng: value(path: "lng")
            city: value(path: "city")
            line1: value(path: "line1")
            line2: value(path: "line2")
            state: value(path: "state")
            country: value(path: "country")
            zipcode: value(path: "zipcode")
         }
         contact: subscriptionStoreSettings(
            where: {
               subscriptionStoreSetting: { identifier: { _eq: "Contact" } }
            }
         ) {
            email: value(path: "email")
            phoneNo: value(path: "phoneNo")
         }
      }
   }
`
