const express = require("express");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const router = express.Router();

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    // avant tout, on vérifie que l'on recoit bien tous les champs requis :

    if (req.body.name && req.body.email && req.body.password) {
      const { name, email, password, newsletter } = req.body;

      // ensuite, on vérifie que l'email est pas déjà pris par un autre user dans la BDD :
      const existingUser = await User.findOne({ email: email });

      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà pris 😱" });
      } else {
        // on va générer un  salt, et un token
        const salt = uid2(16);
        // console.log(salt); // ok
        const token = uid2(32);
        // console.log(token); // ok
        // on va générer un hash
        const saltedPassword = password + salt;
        const hash = SHA256(saltedPassword).toString(encBase64);
        // console.log(hash); // ok
        // on va créer un nouveau user
        const newUser = new User({
          email,
          account: {
            name,
          },
          newsletter,
          token,
          hash,
          salt,
        });
        // l'enregistrer en BDD
        console.log(newUser);
        await newUser.save();
        const responseObject = {
          _id: newUser._id,
          account: {
            name: newUser.account.name,
          },
          token: newUser.token,
        };

        return res.status(201).json(responseObject);
      }
    } else {
      return res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // console.log(req.body); // { email: 'johndoe@lereacteur.io', password: 'azerty' }
    const { email, password } = req.body;
    // aller chercher en utilisant l'email si l'utilisateur existe en BDD
    const userFound = await User.findOne({ email: email });
    if (!userFound) {
      return res.status(401).json("Mot de passe ou email incorrect");
    } else {
      // console.log(userFound);
      //   {
      //     account: { username: 'JohnDoe' },
      //     _id: new ObjectId('663a6bf53934612223f1d278'),
      //     email: 'johndoe@lereacteur.io',
      //     newsletter: true,
      //     token: 'SB97C5iTNMSKWa-NFEy487tdUUmzGFnT',
      //     hash: 'XzLEASW7iOJmhUEqkRJrdctEro+2ndicIPPJXJOzUSA=',
      //     salt: 'DPnXj6zTnICgyh6v',
      //     __v: 0
      //   }
      // on va générer un nouveau hash, en ajoutant le salt de l'utilisateur trouvé en BDD, au password envoyé
      const newSaltedPassword = password + userFound.salt;
      const newHash = SHA256(newSaltedPassword).toString(encBase64);
      // on va ensuite comparé ce nouveau hash à celui qui est stocké dans la base de données
      if (newHash !== userFound.hash) {
        // si les nouveau hash est différent de celui en BDD on répond "unauthorized"
        return res.status(401).json("Mot de passe ou email incorrect");
      } else {
        // sinon, c'est ok, on génère un objet de réponse
        const responseObject = {
          _id: userFound._id,
          account: userFound.account,
          token: userFound.token,
        };
        return res.status(200).json(responseObject);
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
