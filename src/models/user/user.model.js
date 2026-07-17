import mongoose, {Schema} from 'mongoose';
import bcrypt from 'bcrypt';
import jsonWebToken from 'jsonwebtoken';

const userSchema = new Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        index: true
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Videos'
        },
    ],
    userName: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true

    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    avatar: {
        type: String, // cloudinary url
        require: true,
    },
    refreshToken: {
      type: String,
    },
    coverImage: {
        type: String,
    }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if(!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
} )

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken  = function(){
    return jsonWebToken.sign({
        _id: this._id,
        email: this.email,
        fullName: this.fullName,
        userName: this.userName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
};

userSchema.methods.generateRefreshToken = function(){
    return jsonWebToken.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
) 
}

export const User = mongoose.modal('User', userSchema)

