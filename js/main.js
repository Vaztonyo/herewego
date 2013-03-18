(function() {

  var world = {
    time: 0
  };
  function initWorldTime() {
    setInterval(function() {
      // skip a beat if the player is moving
      if (player.isMoving) {
        return;
      }

      world.time += 1;
      updatePlayerStats();

    }, 1000);
  }
  window.debug = function() { debugger; };

  var player = {
    position: {
      x: 73,
      y: 33
    },
    size: {
      width: 1,
      height: 1
    },
    isMoving: false,
    view: null,
    entity: null,
    // returns true if the player managed to move, false otherwise
    move: function(offset) {
      player.isMoving = true;
      var targetPlayerPosition = {x: player.position.x + offset.x, y: player.position.y + offset.y},
          successfulMovement = false;

      if (!player.entity.dead && currentMap.inBounds(targetPlayerPosition) && entities.canPassThroughAll(targetPlayerPosition)) {
        var enemy = entities.getEnemy(targetPlayerPosition);
        if (enemy) {
          var enemyType = enemy.type;
          attack(player.entity, enemy);
          if (!enemy.dead) {
            attack(enemy, player.entity);
            if (player.entity.dead) {
              // game over
            }
          } else {
            // enemy died, give exp
            player.entity.attr('exp', player.entity.attr('exp') + experienceForKillingType(enemyType));
          }
        } else {
          // successful player movement
          player.position = targetPlayerPosition;
          player.view.move(player.position)
          WorldView.centerOnView(player.view);
        }

        // give him more health if he touches a building
        var house = entities.getHouse(targetPlayerPosition);
        if (house) {
          player.entity.attr('health', player.entity.attr('maxHealth'));
        }

        updatePlayerStats();
        successfulMovement = true;
      }
      player.isMoving = false;
      return successfulMovement;
    }
  };

  function updatePlayerStats() {
    HUD.updatePlayerStats({
      health: player.entity.attr("health"),
      maxHealth: player.entity.attr("maxHealth"),
      exp: player.entity.attr("exp"),
      time: world.time,
      position: player.position
    });
  }

  // probably should be a method on GameEntity
  function attack(attacker, victim) {
    // attacker
    var strength = attacker.attr('strength');
    var weaponDamage = attacker.attr('weapon').damage;
    var maxDamage = (strength * 3) + weaponDamage;
    // how much of the damage is random?
    // 0-1
    var accuracy = 0.5; // 0.5 is half
    var fixedDamage = maxDamage * accuracy;
    var randomDamage = Math.random() * maxDamage * (1 - accuracy);
    var damage = fixedDamage + randomDamage;

    // victim
    var health = victim.attr('health');
    var armor = victim.attr('armor');
    if (armor) {
      damage /= armor.strength;
    }
    health -= damage;

    victim.attr('health', health);

    if (health <= 0) {
      victim.setDead();
    }
  }

  var currentMap, entities;
  window.onload = function() {

    entities = new EntitiesHash();

    // create map
    var landSize = {width: 1, height: 1};
    currentMap = WorldMap.getMap("start");
    currentMap.getViews(function(position, type) {
      var view = new View(position, landSize, type);
      var entity = new GameEntity(type, view);
      WorldView.addView(view);
      entities.add(position, entity);

      // figure out if we should show an alien here
      if (Math.floor(Math.random() * 150) < 1) {
        if (entity.canPassThrough()) {
          var alienView = new View(position, {width: 1, height: 1}, ALIEN);
          var alien = new GameEntity(ALIEN, alienView);
          WorldView.addView(alienView);
          entities.add(position, alien);
        }
      }
    });

    // makes it so the viewport can't be scrolled past these limits
    WorldView.setViewportOffsetLimits(currentMap.getRect());

    // create the player view
    player.view = new View(player.position, player.size, PLAYER);
    player.entity = new GameEntity(PLAYER, player.view);
    WorldView.addView(player.view);
    entities.add(player.position, player.entity);

    // make all buildings
    [{x: 6, y: 5}, {x: 63, y: 31}, {x: 41, y: 41}, {x: 38, y: 56}, {x: 76, y: 15}].forEach(function(housePosition) {
      var houseView = new View(housePosition, {width: 1, height: 1}, HOUSE);
      var house = new GameEntity(HOUSE, houseView);
      WorldView.addView(houseView);
      entities.add(housePosition, house);
    });

    // initializing the world basically adds all the stuff to the main div
    WorldView.init();

    WorldView.centerOnView(player.view);
    updatePlayerStats();

    initWorldTime();
  }

  var key = {
    up: 38,
    down: 40,
    left: 37,
    right: 39
  };
  // bad horrible attempt at limiting movement speed
  var lastAction = new Date();
  document.onkeydown = function(e) {
    var now = new Date(),
        keyCode = e.keyCode,
        playerMoveSuccessful = false;

    if (now - lastAction < PLAYER_MOVEMENT_RATE) {
      return false;
    }

    switch (keyCode) {
      case key.up:
        playerMoveSuccessful = player.move({x:0,y:-1});
        break;
      case key.down:
        playerMoveSuccessful = player.move({x:0,y:1});
        break;
      case key.left:
        playerMoveSuccessful = player.move({x:-1,y:0});
        break;
      case key.right:
        playerMoveSuccessful = player.move({x:1,y:0});
        break;
      default:
        console.log("Key pressed:", e.keyCode, e.keyIdentifier);
        // return so we won't set the lastAction date again
        // maybe it would be better to know if the game time had changed
        return true;
    }
    if (playerMoveSuccessful) {
      lastAction = now;
    }
    return false;
  };


})();
