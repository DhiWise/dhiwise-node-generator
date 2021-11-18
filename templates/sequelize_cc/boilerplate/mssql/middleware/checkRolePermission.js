const { Op } = require('sequelize');
const model = require('../model');

const { userRole } = model;
const { routeRole } = model;
const { projectRoute } = model;
const userRoleDbService = require('../services/dbService')({ model: userRole });
const routeRoleDbService = require('../services/dbService')({ model: routeRole });
const projectRoleDbService = require('../services/dbService')({ model: projectRoute });
const { replaceAll } = require('../utils/common');
const sendResponse = require('../helpers/sendResponse');
const message = require('../utils/messages');

const checkRolePermission = async (req, res, next) => {
  if (req.user) {
    const loggedInUserId = req.user.id;
    let rolesOfUser = await userRoleDbService.findMany({
      userId: loggedInUserId,
      isActive: true,
      isDeleted: false,
    },
    { attributes: ['roleId'] });
    if (rolesOfUser && rolesOfUser.data && rolesOfUser.data.length) {
      rolesOfUser = [...new Set((rolesOfUser.data).map((item) => item.roleId))];
      const route = await projectRoleDbService.findOne({
        route_name: replaceAll((req.route.path.toLowerCase()).substring(1), '/', '_'),
        uri: req.route.path.toLowerCase(),
      });
      if (route) {
        const allowedRoute = await routeRoleDbService.findMany({
          [Op.and]: [
            { routeId: route.id },
            { roleId: { [Op.in]: rolesOfUser } },
            { isActive: true },
            { isDeleted: false },
          ],
        });
        if (allowedRoute && allowedRoute.data.length) {
          next();
        } else {
          sendResponse(res, message.unAuthorizedRequest());
        }
      } else {
        next();
      }
    } else {
      /*
       * sendResponse(res, message.unAuthorizedRequest());
       */
      next();
    }
  } else {
    sendResponse(res, message.unAuthorizedRequest());
  }
  return undefined;
};

module.exports = checkRolePermission;
