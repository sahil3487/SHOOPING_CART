const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId



const orderSchema = new mongoose.Schema({
    totalPrice: {
        type: Number,
        required: true,
        comment: "Holds total price of all the items in the order"

    },
    totalItems: {
        type: Number,
        required: true,
        comment: "Holds total number of items in the order"
    },
    totalQuantity: {
        type: Number,
        required: true,
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
        required: true,

    },

    cancellable: {
        type: Boolean,
        default: true
    },

    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'completed', 'cancled']
    },

    deletedAt: {
        type: Date
    },

    isDeleted: {
        type: Boolean,
        default: false
    },


}
    , { timestamps: true });




module.exports = mongoose.model('Order', orderSchema);
