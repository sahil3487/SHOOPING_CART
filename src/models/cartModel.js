const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId



const cartSchema = new mongoose.Schema({
    totalPrice: {
        type: Number,
        required: true,
        comment: "Holds total price of all the items in the cart"

    },
    totalItems: {
        type: Number,
        required: true,
        comment: "Holds total number of items in the cart"
    },

    items: [
        {
            productId: { type: ObjectId, ref: 'Product', required: true }    // [{pid1,pqnt1},{pid2,pqnt2},{pid3,pqnt3},{pid4,pqnt4},v]
            , quantity: { type: Number, required: true, min: 1 }, _id: false
        }
    ],

    userId: {
        type: ObjectId,
        ref: "User",
        unique: true,
        required: true,

    }
}
    , { timestamps: true });


module.exports = mongoose.model('Cart', cartSchema);