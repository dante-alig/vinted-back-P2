const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json("Unauthorized");
  } else {
    const token = req.headers.authorization.replace("Bearer ", "");
    // console.log(token); // TiWFYVCMDPsF4eBBKYUsPO5JQLrIxGez
    const existingUser = await User.findOne({ token: token });
    // console.log(existingUser);
    if (!existingUser) {
      return res.status(401).json("Unauthorized");
    } else {
      // dans l'objet req (qui sera récupéré dans la route par la suite), on crée une clef "user", à laquelle on associe l'utilisateur trouvé grace au findOne
      req.user = existingUser;
      return next();
    }
  }
};

module.exports = isAuthenticated;
