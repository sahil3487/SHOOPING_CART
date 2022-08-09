
const userModel = require('../models/userModel')
const secretKey = "Project5-Group3";
const bcrypt = require("bcrypt")
const { uploadFile } = require("../cloudComputing/aws")
const { keyValue, isValid, isValidEmail, passwordRegex, phoneRegex, isValidName, isValidObjectId, pincodeRegex } = require("../validators/validator");
const jwt = require("jsonwebtoken");




//---------------------------------------create user--------------------------------------------------------
const createUser = async (req, res) => {
    try {
        let finalDetails = req.body
        let files = req.files

        let { fname, lname, email, password, phone, address } = finalDetails

        //validate body
        if (!keyValue(finalDetails)) {
            return res.status(400).send({ status: false, message: "please provide user data" })
        }

        //validate fname
        if (!isValid(fname)) {
            return res.status(400).send({ status: false, messege: "please provide name" })
        }
        if (!isValidName(fname)) {
            return res.status(400).send({ status: false, messege: "please provide correct name" })
        }

        //validate lname
        if (!isValid(lname)) {
            return res.status(400).send({ status: false, messege: "please provide lname" })
        }
        if (!isValidName(lname)) {
            return res.status(400).send({ status: false, messege: "please provide correct lname" })
        }

        //validate email
        if (!isValid(email)) {
            return res.status(400).send({ status: false, messege: "please provide email" })
        }
        if (!isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "Please provide valid Email Address" });
        }

        //duplicate email validation 
        let isDuplicateEmail = await userModel.findOne({ email })
        if (isDuplicateEmail) {
            return res.status(400).send({ status: false, message: "email already exists" })
        }

        //validate phone 
        if (!isValid(phone)) {
            return res.status(400).send({ status: false, messege: "please provide phone number" })
        }
        //phone number should be valid indian number 
        if (!phoneRegex(phone)) {
            return res.status(400).send({ status: false, msg: "phone number is invalid!" })
        }
        //duplicate phone validation
        let duplicatePhone = await userModel.findOne({ phone })        // DB Call

        if (duplicatePhone) return res.status(400).send({ status: false, msg: "phone number is already registered!" })

        //validate password 
        if (!isValid(password)) {
            return res.status(400).send({ status: false, messege: "please provide password" })
        }
        //password must contain 8 to 15 char
        if (!passwordRegex(password)) {
            return res.status(400).send({ status: false, messege: "invalid password" })
        }
        //encrpt password 
        req.body.password = await bcrypt.hash(password, 10);

        //validate files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            finalDetails["profileImage"] = uploadedFileURL
        }
        else {
            return res.status(400).send({ status: false, msg: "No Profile Image found" })
        }

        //validate address
        if (!isValid(address)) return res.status(400).send({ status: false, message: "please provide address" })

        if (address) {

            address = JSON.parse(address)
            console.log(address)
            const { shipping, billing } = address

            //validate shipping address
            if (address.shipping) {
                const { street, city, pincode } = shipping

                //validate street,city pincode
                if (!shipping.street) return res.status(400).send({ status: false, message: "please provide shipping street" })
                if (!isValid(street)) return res.status(400).send({ status: false, message: "street is not valid" })


                if (!shipping.city) { return res.status(400).send({ status: false, message: "please provide shipping city" }) }
                if (!isValid(city)) return res.status(400).send({ status: false, message: "city is not valid" })
                if (!isValidName(city)) return res.status(400).send({ status: false, message: "city name is not in valid format" })


                if (!shipping.pincode) { return res.status(400).send({ status: false, message: "please provide shipping pincode" }) }
                if (!isValid(pincode)) return res.status(400).send({ status: false, message: "pincode is not valid" })
                if (!pincodeRegex(pincode)) return res.status(400).send({ status: false, message: "pincode is not in valid format" })

            } else return res.status(400).send({ status: false, message: "please provide shipping address" })

            //validate billing address
            if (address.billing) {
                const { street, city, pincode } = billing

                //validate street ,city,pincode
                if (!billing.street) return res.status(400).send({ status: false, message: "please provide billing street" })
                if (!isValid(street)) return res.status(400).send({ status: false, message: "street is not valid" })


                if (!billing.city) return res.status(400).send({ status: false, message: "please provide billing address" })
                if (!isValid(city)) return res.status(400).send({ status: false, message: "city is not valid" })
                if (!isValidName(city)) return res.status(400).send({ status: false, message: "city name is not in valid format" })


                if (!billing.pincode) return res.status(400).send({ status: false, message: "please provide billing pincode" })
                if (!isValid(pincode)) return res.status(400).send({ status: false, message: "billing pincode is not valid" })
                if (!pincodeRegex(pincode)) return res.status(400).send({ status: false, message: "pincode is not in valid format" })

            } else return res.status(400).send({ status: false, message: "please provide billing address" })

        }
        finalDetails.address = address

        //create user
        let savedData = await userModel.create(finalDetails)

        return res.status(201).send({ status: true, msg: "user created successfully", data: savedData });
    }

    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



//-------------------------------------------------login user--------------------------------------------------

const loginUser = async function (req, res) {
    try {
        const { email, password } = req.body; //destructioring

        //Email Validation

        if (!isValid(email)) {
            return res.status(400).send({ status: false, message: "email id is required" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "Valid email id required" });
        }

        //Password validation

        if (!isValid(password)) {
            return res.status(400).send({ status: false, message: "password is required" });
        }

        const findUser = await userModel.findOne({ email });            //Db call

        if (!findUser) {
            return res.status(401).send({ status: false, message: "Incorrect email Id" });
        }

        //compare password & encrypt password
        let hashedPassword = await bcrypt.compare(password, findUser.password)

        if (!hashedPassword) return res.status(401).send({ status: false, msg: "Login failed! Wrong password." });

        //Token Generation
        var token = jwt.sign({
            userId: findUser._id.toString(),
            iat: Math.floor(new Date().getTime() / 1000)
        },
            secretKey, {
            expiresIn: "1h", // token expire time
        });


        return res.status(200).send({status: true, message: "login successfully", data: { userId: findUser._id.toString(), token: token },
        });

    } catch (error) {
        res.status(500).send({ status: false, Error: error.message });
    }
};



//---------------------------------------------------getUser-------------------------------------------------
const getUser = async function (req, res) {
    try {

        let data = req.params.userId

        //validate userid
        if (!data) return res.status(400).send({ status: false, msg: "please enter user id" })
        if (!isValidObjectId(data)) return res.status(400).send({ status: false, data: "please provide correct id" })

        //checking authorization
        if (req.loggedInUserId != data) {
            return res.status(403).send({ status: false, msg: "Unauthorize! userId doesnot match" })
        }
        //Db call
        let findUser = await userModel.findOne({ _id: data })
        if (!findUser) return res.status(404).send({ status: false, meg: "No Data Found For this ID" })

        return res.status(200).send({ status: true, message: 'User list', Data: findUser })
    }
    catch (err) {
        console.log(err)
        res.status(500).send({ status: false, msg: err.message })
    }
}




//---------------------------------------------update User-----------------------------------------------

const updateUser = async (req, res) => {
    try {
        let userId = req.params.userId

        //validate userid
        if (!userId)
            return res.status(400).send({ status: false, message: 'pls give a userId in params' })
        if (!isValidObjectId(userId))
            return res.status(400).send({ status: false, message: 'pls give a valid userId in params' })

        //Db call
        let user = await userModel.findById(userId)
        if (!user)
            return res.status(404).send({ status: false, message: 'sorry, No such user exists with this Id' })

        //checking authorization
        if (userId !== req.loggedInUserId)
            return res.status(403).send({ status: false, msg: "Not Authorised" })

        let body = req.body;
        let { fname, lname, email, profileImage, phone, password, address, shipping, billing } = body;

        //validate files
        if (Object.keys(body).length === 0 && req.files == undefined)
            return res.status(400).send({ status: false, message: 'please enter body' })


        let obj = {};

        if (fname == "") return res.status(400).send({ status: false, message: "Don't leave fname Empty" })
        if (fname) {
            if (!isValid(fname)) return res.status(400).send({ status: false, message: "Don't leave fname Empty" })
            if (!isValidName(fname)) return res.status(400).send({ status: false, message: "Pls Enter Valid fname" })
            obj.fname = fname
        }

        if (lname == "") return res.status(400).send({ status: false, message: "Don't leave lname Empty" })
        if (lname) {
            if (!isValid(lname)) return res.status(400).send({ status: false, message: "Don't leave lname Empty" })
            if (!isValidName(lname)) return res.status(400).send({ status: false, message: "Pls Enter Valid lname" })
            obj.lname = lname
        }

        if (email == "") return res.status(400).send({ status: false, message: "Don't leave email Empty" })
        if (email) {
            if (!isValid(email)) return res.status(400).send({ status: false, message: "Don't leave email Empty" })
            if (!isValidEmail(email)) return res.status(400).send({ status: false, message: "Pls Enter Valid email" })
            if (await userModel.findOne({ email })) return res.status(400).send({ status: false, message: "this email has already been used" })
            obj.email = email
        }

        if (profileImage) {
            let files = req.files
            if (!(files && files.length > 0)) {
                return res.status(400).send({ status: false, message: " Please Provide The Profile Image" });
            }
            const uploadedBookImage = await uploadFile(files[0])
            obj.profileImage = uploadedBookImage
        }

        if (phone == "") return res.status(400).send({ status: false, message: "Don't leave phone Empty" })
        if (phone) {
            if (!isValid(phone)) return res.status(400).send({ status: false, message: "Don't leave phone number Empty" })
            if (!phoneRegex(phone)) return res.status(400).send({ status: false, message: "Pls Enter Valid phone number" })
            if (await userModel.findOne({ phone })) return res.status(400).send({ status: false, message: "this phone number has already been used" })
            obj.phone = phone
        }

        if (password == "") return res.status(400).send({ status: false, message: "Don't leave password Empty" })
        if (password) {
            if (!isValid(password)) return res.status(400).send({ Status: false, message: " password is required" })
            if (!passwordRegex(password)) return res.status(400).send({ Status: false, message: " Please enter a valid password, minlength 8, maxxlength 15" })


            bcryptedPassword = await bcrypt.hash(password, 10);     //generate salt to hash password
            obj.password = bcryptedPassword                        // set user password to hashed password
        }

        if (address == "") return res.status(400).send({ status: false, message: "Don't leave address Empty" })

        if ("address" in body) {
            if (!address || Object.keys(address).length === 0) {
                return res.status(400).send({ status: false, message: "Please enter address and it should be in object!!" })
            }

            let addresss = JSON.parse(address)

            const { shipping, billing } = addresss

            if ("shipping" in addresss) {
                const { street, city, pincode } = shipping

                if ("street" in shipping) {
                    if (!isValid(street)) {
                        return res.status(400).send({ status: false, message: "street is not valid" })
                    }
                    obj["addresss.shipping.street"] = street
                }

                if ("city" in shipping) {
                    if (!isValid(city)) return res.status(400).send({ status: false, message: "city is not valid" })
                    if (!isValidName(city)) return res.status(400).send({ status: false, message: "city name is not in valid format" })

                    obj["addresss.shipping.city"] = city
                }

                if ("pincode" in shipping) {
                    if (!isValid(pincode)) return res.status(400).send({ status: false, message: "pincode is not valid" })
                    if (!pincodeRegex(pincode)) return res.status(400).send({ status: false, message: "pincode is not in valid format" })
                    obj["addresss.shipping.pincode"] = pincode
                }
            }

            if ("billing" in addresss) {
                const { street, city, pincode } = billing

                if ("street" in billing) {
                    if (!isValid(street)) return res.status(400).send({ status: false, message: "street is not valid" })
                    obj["addresss.billing.street"] = street
                }

                if ("city" in billing) {
                    if (!isValid(city)) return res.status(400).send({ status: false, message: "city is not valid" })
                    if (!isValidName(city)) return res.status(400).send({ status: false, message: "city name is not in valid format" })
                    obj["addresss.billing.city"] = city
                }

                if ("pincode" in billing) {
                    if (!isValid(pincode)) return res.status(400).send({ status: false, message: "shipping pincode is not valid" })
                    if (!pincodeRegex(pincode)) return res.status(400).send({ status: false, message: "pincode is not in valid format" })
                    obj["addresss.billing.pincode"] = pincode
                }
            }
            obj["address"] = addresss
        }

        let updatedUser = await userModel.findOneAndUpdate({ _id: userId }, { $set: obj }, { new: true })
        res.status(200).send({ status: true, message: "User profile updated", data: updatedUser })

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

module.exports.createUser = createUser
module.exports.getUser = getUser
module.exports.loginUser = loginUser
module.exports.updateUser = updateUser
