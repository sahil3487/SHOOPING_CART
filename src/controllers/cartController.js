const cartModel = require('../models/cartModel')
const userModel = require('../models/userModel')
const productModel = require('../models/productModel');
const validator = require('../validators/validator')
const mongoose = require('mongoose');


//-------------------------------------------add to cart--------------------------------

const addToCart = async (req, res) => {
    try {
        let userId = req.params.userId
        let productId = req.body.productId
        let quantity = req.body.quantity || 1      //it takes default quantity 1 or any number of quantity  

        if(req.body.quantity==0)
        return res.status(400).send({status:false,msg: "quantity cant be 0"})

        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }
        const findUser = await userModel.findById({ _id: userId })
        if (!findUser) return res.status(404).send({ status: false, msg: "user not found" })

        if (req.loggedInUserId !== req.params.userId)
            return res.status(403).send({ status: false, message: "Not Authorised" })

        if (!validator.isValid(productId)) {
            return res.status(400).send({ status: false, messege: "please provide productId" })
        }

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }
        const findProduct = await productModel.findById({ _id: productId })
        if (!findProduct) return res.status(404).send({ status: false, msg: "product not found" })

        if (!validator.isValid(quantity)) {
            return res.status(400).send({ status: false, messege: "please provide quantity" })
        }
        quantity = parseInt(quantity);
        if (isNaN(quantity))
            return res.status(400).send({ status: false, messege: "please provide valid quantity" })

        // Create new cart
        let cartExist;
        if (!(cartExist = await cartModel.findOne({ userId: userId }))) {
            const savedData = await cartModel.create({
                userId: userId,
                items: [{ productId, quantity }],
                totalPrice: findProduct.price * quantity,
                totalItems: 1
            })
            
           // savedData=await cartModel.findOne({ userId: userId },{__v:0}).populate('items.productId', { __v: 0 })
            return res.status(201).send({ status: true, message: "Success", data: savedData })
        }

        //if cart already exist
        let update = {};
        update.$inc = {
            totalPrice: (findProduct.price * quantity),
            'items.$[element].quantity': quantity               //$elements has all the prdct and qnty ,here we r fetching qnty of 1 specific prdct
        }

        if (cartExist.items.find((x) => {
            if (x.productId.toString() == productId) {          //if the same product is added into cart
                return true;
            }
        })) {
            const savedData = await cartModel.findOneAndUpdate(
                { _id: cartExist._id }, update
                , { new: true, "arrayFilters": [{ "element.productId": productId }] }  //product which we want to add into cart
                ).populate('items.productId', { __v: 0 })                              //arrayFilters idendifies the given condition

            return res.status(201).send({ status: true, message: "Success", data: savedData })
        }


        update.$inc = { totalPrice: (findProduct.price * quantity), totalItems: 1 }
        update.$push = { items: { productId, quantity } }
        const savedData = await cartModel.findOneAndUpdate({ _id: cartExist._id }, update, { new: true }).populate('items.productId', { __v: 0 })
        return res.status(201).send({ status: true, message: "Success", data: savedData })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}






//-----------------------------------------updateCart-------------------------------
const updateCart = async (req, res) => {
    try {
        
        let userId= req.params.userId
        let productId = req.body.productId
        let removeProduct = req.body.removeProduct

        if (!validator.isValid(userId)) {
            return res.status(400).send({ status: false, msg: "userId is required" });
        }

        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }
        
        if (!validator.isValid(productId)) {
            return res.status(400).send({ status: false, msg: "productId is required" });
        }

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }
        
        if (!validator.isValid(removeProduct)) {
            return res.status(400).send({ status: false, msg: "removeProduct  key is required" });
        }

       if(!(!isNaN(parseInt(removeProduct)) && (parseInt(removeProduct) == 0 || parseInt(removeProduct) == 1)))
          return res.status(400).send({status: false, msg: "removeProduct is invalid"});

        if (req.loggedInUserId !== userId)
            return res.status(403).send({ status: false, message: "Autherization Failed" })

        // Checking User
        let user;
        if (!(user = await userModel.findById(userId)))
            return res.status(404).send({ status: false, message: "User DoesNot Exist" })
        let product;
        if (!(product = await productModel.findById(productId)) || product.isDeleted == true)
            return res.status(404).send({ status: false, message: "Product DoesNot Exist" })
        let cart;
        if (!(cart = await cartModel.findOne({ userId: user._id })))
            return res.status(404).send({ status: false, message: "Cart DoesNot Exist" })

        // removeProduct==0
        if (removeProduct == 0) {

            let productQuantity;

            cart.items.forEach((x) => {

                if (x.productId.toString() == product._id)
                    productQuantity = x.quantity;
            })


            if (productQuantity === undefined) return res.status(404).send({ status: false, message: "Product not In Cart" })
            let update = {}
            update.inc = {
                totalPrice: -(product.price * productQuantity),
                totalItems: -1
            }


            cart = await cartModel.findOneAndUpdate({ _id: cart._id }, { $inc: update.inc, "$pull": { "items": { "productId": product._id } } }, { new: true }).select({ __v: 0 }).populate('items.productId', { __v: 0 })
            return res.status(200).send({ status: true, message: "Success", data: cart });
        }




        // removeProduct==1
        cart = await cartModel.findOne({ userId: user._id });
        let productQuantity;
        cart.items.forEach((x) => {
            if (x.productId.toString() == product._id) {
                productQuantity = x.quantity;

            }
        })

        if (productQuantity === undefined) return res.status(404).send({ status: false, message: "Product not In Cart" })

        if (productQuantity == 1)
            cart = await cartModel.findOneAndUpdate({ _id: cart._id }, { $inc: { totalItems: -1, totalPrice: -product.price }, "$pull": { "items": { "productId": product._id } } }, { new: true }).populate('items.productId', { __v: 0 })

        else {
            let update = {}
            update.$inc = {
                totalPrice: -product.price,

                'items.$[element].quantity': -1
            }
            cart = await cartModel.findOneAndUpdate({ _id: cart._id }, update, { new: true, "arrayFilters": [{ "element.productId": product._id }] }).populate('items.productId', { __v: 0 })
        }

        if (cart.totalItems == 0)
            cart = await cartModel.findOneAndUpdate({ _id: cart._id }, { totalPrice: 0 }, { new: true }).populate('items.productId', { __v: 0 })
        return res.status(201).send({ status: true, message: "Success", data: cart })


    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }


}





//----------------------------------get cart------------------------------------------
const getCart = async (req, res) => {
    try {
        if (!validator.isValidObjectId(req.params.userId))
            res.status(400).send({ status: false, message: "Invalid UserId" })

        if (req.loggedInUserId !== req.params.userId)
            return res.status(403).send({ status: false, message: "Autherization Failed" })

        // Checking User
        let user;
        if (!(user = await userModel.findById(req.params.userId)))
            return res.status(404).send({ status: false, message: "User DoesNot Exist" })

        let cart;
        if (!(cart = await cartModel.findOne({ userId: user._id }, { __v: 0 }).populate('items.productId', { __v: 0 })))
            return res.status(404).send({ status: false, message: "Cart DoesNot Exist" })

        if (cart.totalPrice === 0) {
            return res.status(404).send({ status: false, msg: "your cart is empty." })
        }

        return res.status(200).send({ status: true, data: cart })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}




//-------------------------------------------delete cart-----------------------------------
const deleteCart = async (req, res) => {
    try {
        if (!validator.isValidObjectId(req.params.userId))
            return res.status(400).send({ status: false, message: "Invalid UserId" })

        if (req.loggedInUserId !== req.params.userId)
            return res.status(403).send({ status: false, message: "Autherization Failed" })

        // Checking User
        let user;
        if (!(user = await userModel.findById(req.params.userId)))
            return res.status(404).send({ status: false, message: "User DoesNot Exist" })

        let findCart;
        if (!(findCart = await cartModel.findOne({ userId: user._id })))
            return res.status(404).send({ status: false, message: "Cart DoesNot Exist" })

        if (findCart.totalPrice === 0) {
            return res.status(404).send({ status: false, msg: "your cart is empty." })
        }
        let cart = await cartModel.findOneAndUpdate({ userId: user._id }, { totalPrice: 0, totalItems: 0, items: [] }, { new: true })
        return res.status(204).send({ status: true, message: "Success", data: cart })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


module.exports.addToCart = addToCart;
module.exports.getCart = getCart
module.exports.deleteCart = deleteCart;
module.exports.updateCart = updateCart;
