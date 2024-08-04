const express = require("express");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const isAuthenticated = require("./middlewares/isAuthenticated");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const Offer = mongoose.model("Offer", {
  product_name: String,
  product_description: String,
  product_price: Number,
  product_details: Array,
  product_image: Object,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

app.get("/", (req, res) => {
  try {
    return res.status(200).json("Bienvenue sur notre serveur Vinted !");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

const userRoutes = require("./routes/user");

app.use(userRoutes);

app.post("/offer/publish", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    const { title, description, price, condition, city, brand, size, color } =
      req.body;

    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: Number(price),
      product_details: [
        {
          MARQUE: brand,
        },
        {
          TAILLE: size,
        },
        {
          ÉTAT: condition,
        },
        {
          COULEUR: color,
        },
        {
          EMPLACEMENT: city,
        },
      ],
      owner: req.user,
    });

    if (req.files) {
      const convertedPicture = convertToBase64(req.files.picture);
      // console.log(convertedPicture); // affiche une belle base64
      // UPLOAD de l'image sur CLOUDINARY :
      const uploadResult = await cloudinary.uploader.upload(convertedPicture);

      newOffer.product_image = uploadResult;
    }

    console.log(newOffer);
    await newOffer.save();

    return res.status(201).json(newOffer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/offers/all", async (req, res) => {
  try {
    const filters = {};
    const { title, priceMin, priceMax, sort } = req.query;

    console.log(title, priceMin, priceMax, sort);

    // Filtrer par titre
    if (title) {
      filters.product_name = new RegExp(title, "i"); // Recherche insensible à la casse
    }

    // Filtrer par prix minimum
    if (priceMin) {
      filters.product_price = {
        ...filters.product_price,
        $gte: Number(priceMin),
      };
    }

    // Filtrer par prix maximum
    if (priceMax) {
      filters.product_price = {
        ...filters.product_price,
        $lte: Number(priceMax),
      };
    }

    // Définir le tri
    let sortOption = {};
    if (sort === "price-desc") {
      sortOption.product_price = -1;
    } else if (sort === "price-asc") {
      sortOption.product_price = 1;
    }

    const offers = await Offer.find(filters).sort(sortOption).populate("owner");
    console.log("filter >>>>>", filters);
    console.log("filter >>>>>", sortOption);
    console.log(offers);

    return res.status(200).json(offers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/offers", async (req, res) => {
  try {
    const filters = {};
    // ici, on va faire notre recherche avec ou sans filtres :
    // pour étendre notre recherche à toutes les occurences correspondantes (et non les restreindre au nom exact), on va utiliser une Regular Expression
    // deux possibilités pour faire une regexp :
    //  - un pattern classique /pantalon/i
    // - lun constructor : new RegExp("pantalon", "i")

    // recherche par nom d'offre :
    // const regex = new RegExp(req.query.title, "i");
    // const offers = await Offer.find({
    //   product_name: regex,
    // }).select("product_name product_price -_id");

    // rechercher une fourchette de prix :
    // const offers = await Offer.find({
    //   product_price: { $gte: 20, $lte: 40 },
    // }).select("product_name product_price -_id");

    // trier les offres (selon le prix) :
    // const offers = await Offer.find()
    //   .sort({ product_price: "asc" })
    //   .select("product_name product_price -_id");

    const limit = 5;
    // faire une pagination
    // formule :
    // limit = 5
    // page 1, skip : 0
    // page 2 , skip : 5
    // page 3, skip: 10
    // page 4, skip : 15

    // skip = (page - 1) * limit

    // pour pouvoir limiter le nombres d'offres reçues en réponse, on utilise la méthode LIMIT :
    // pour voir accéder aux pages suivantes, on va utiliser la méthode SKIP (sauter en francais), permettant de "sauter" des offres :
    const offers = await Offer.find(filters)
      .sort({ product_price: "asc" })
      .limit(limit)
      .skip()
      .select("product_name product_price -_id");

    return res.status(200).json(offers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.all("*", (req, res) => {
  return res.status(404).json("Vous vous êtes perdu 👀");
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server started 🔥🔥🔥🔥");
});
