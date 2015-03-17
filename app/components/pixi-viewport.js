import Ember from 'ember';
import layout from '../templates/components/pixi-viewport';
/* global PIXI */

export default Ember.Component.extend({
  layout: layout,
  classNames: ['fullscreen'],

  /**
   * The actor which is current displayed
   * @type {Actor}
   */
  actor: null,
  /**
   * Current selected child of the actor
   * @type {Actor}
   */
  selected: null,
  /**
   * Whether current selected actor editable?
   * @type {Boolean}
   */
  selectedEditable: false,
  /**
   * Event emitter which fires actor delete events
   * @type {Object}
   */
  actorDeleteEventEmitter: null,
  /**
   * Event emitter which fires actor property update events
   * @type {Object}
   */
  actorPropertyUpdateEventEmitter: null,

  renderer: null,
  stage: null,
  root: null,

  instModelHash: {},

  willInsertElement: function() {
    // Setup Pixi
    this.set('renderer', new PIXI.CanvasRenderer());
    this.set('stage', new PIXI.Stage());
    this.set('root', new PIXI.DisplayObjectContainer());

    this.get('root.position').set(200, 0); // Do not hover by outliner
    this.get('stage').addChild(this.get('root'));
  },
  didInsertElement: function() {
    // Insert pixi canvas
    this.$().append(this.get('renderer.view'));
    // Start run loop
    var self = this, selected;
    requestAnimationFrame(animate);
    function animate() {
      self.get('renderer').render(self.get('stage'));
      requestAnimationFrame(animate);
    }

    // Setup resizing service
    this.resizeNotificationService.on('windowResizedLowLatency', this, this.resizeRenderer);
    this.resizeRenderer();

    // Listen to actor events
    this.get('actorDeleteEventEmitter').on('deleteActor', this, this.actorDeleted);
    this.get('actorPropertyUpdateEventEmitter').on('updateActorProperty', this, this.actorPropertyChanged);
  },
  willDestroyElement: function() {
    this.get('actorDeleteEventEmitter').off('deleteActor', this, this.actorDeleted);
    this.get('actorPropertyUpdateEventEmitter').off('updateActorProperty', this, this.actorPropertyChanged);

    this.resizeNotificationService.off('windowResizedLowLatency',
    this, this.resizeRenderer);
  },

  actorChanged: function() {
    // Cleanup viewport
    this.get('root').removeChildren();

    // Create instances for actor and its children
    var actor = this.get('actor');
    var assetsToLoad = [
      'media/sprites.json'
    ];
    var loader = new PIXI.AssetLoader(assetsToLoad);
    loader.onComplete = function() {
      this.get('stage').setBackgroundColor(0xb2dcef);
      this.createInstance(actor);
    }.bind(this);
    loader.load();
  }.observes('actor').on('didInsertElement'),
  actorPropertyChanged: function(actor) {
    var pair = this.instModelHash[actor.get('id')];
    if (pair) {
      this.syncInstOf(actor);
    }
  },
  actorDeleted: function(actor) {
    var pair = this.instModelHash[actor.get('id')];
    if (pair) {
      // Remove instance of this actor from stage
      pair.inst.parent.removeChild(pair.inst);
    }
  },

  resizeRenderer: function() {
    this.get('renderer').resize(this.$().width(), this.$().height());
  },

  createInstance: function(actor, parent) {
    switch (actor.get('nodeType')) {
      case 'actor':
        this.createActorInstance(actor, parent);
        break;
      case 'sprite':
        this.createSpriteInstance(actor, parent);
        break;
      case 'animation':
        this.createAnimationInstance(actor, parent);
        break;
      case 'tiling-sprite':
        this.createTilingSpriteInstance(actor, parent);
        break;
    }
  },
  createActorInstance: function(actor, parent) {
    // Create actor instance
    var inst = new PIXI.DisplayObjectContainer();

    // Save actor-instance pair to hash for later use
    inst.id = actor.get('id');
    this.instModelHash[actor.get('id')] = {
      actor: actor,
      inst: inst
    };

    // Update instance properties based on its model
    // ONLY sync non-root actors
    if (this.get('actor.id') !== actor.get('id')) {
      this.syncActorInst(actor, inst);
    }

    // Add to parent
    parent = parent || this.get('root');
    parent.addChild(inst);

    // Create instances for children (Actor ONLY)
    var self = this;
    actor.get('children').forEach(function(child) {
      self.createInstance(child, inst);
    });
  },
  createAnimationInstance: function(actor, parent) {
    // Create animation instance
    var inst;
    if (actor.get('useSpritesheet')) {
      // TODO: support spritesheet animation
    }
    else {
      inst = new PIXI.MovieClip(actor.get('frames').map(function(frame) {
        return PIXI.Texture.fromImage(frame);
      }));
    }

    // Save actor-instance pair to hash for later use
    inst.id = actor.get('id');
    this.instModelHash[actor.get('id')] = {
      actor: actor,
      inst: inst
    };

    // Update instance properties based on its model
    this.syncAnimationInst(actor, inst);

    // Add to parent
    parent = parent || this.get('root');
    parent.addChild(inst);
  },
  createSpriteInstance: function(actor, parent) {
    // Create sprite instance
    var tex = PIXI.Texture.fromImage(actor.get('image'));
    var inst = new PIXI.Sprite(tex);

    // Save actor-instance pair to hash for later use
    inst.id = actor.get('id');
    this.instModelHash[actor.get('id')] = {
      actor: actor,
      inst: inst
    };

    // Update instance properties based on its model
    this.syncSpriteInst(actor, inst);

    // Add to parent
    parent = parent || this.get('root');
    parent.addChild(inst);
  },
  createTilingSpriteInstance: function(actor, parent) {
    // Create tiling-sprite instance
    var tex = PIXI.Texture.fromImage(actor.get('image'));
    var inst = new PIXI.TilingSprite(tex, actor.get('size.x'), actor.get('size.y'));

    // Save actor-instance pair to hash for later use
    inst.id = actor.get('id');
    this.instModelHash[actor.get('id')] = {
      actor: actor,
      inst: inst
    };

    // Update instance properties based on its model
    this.syncTilingSpriteInst(actor, inst);

    // Add to parent
    parent = parent || this.get('root');
    parent.addChild(inst);
  },

  syncInstOf: function(actor) {
    if (!this.get('selectedEditable')) { return; }

    var pair = this.get('instModelHash')[actor.get('id')];
    if (pair) {
      switch (actor.get('nodeType')) {
        case 'actor':
          this.syncActorInst(actor, pair.inst);
          break;
        case 'animation':
          this.syncAnimationInst(actor, pair.inst);
          break;
        case 'sprite':
          this.syncSpriteInst(actor, pair.inst);
          break;
        case 'tiling-sprite':
          this.syncTilingSpriteInst(actor, pair.inst);
          break;
      }
    }
  },
  syncActorInst: function(actor, inst) {
    // Actor attributes
    inst.alpha = actor.get('alpha');
    inst.rotation = actor.get('rotation');
    inst.width = actor.get('size.x');
    inst.height = actor.get('size.y');
    inst.position.set(actor.get('position.x'), actor.get('position.y'));
  },
  syncAnimationInst: function(actor, inst) {
    // Actor attributes
    inst.alpha = actor.get('alpha');
    inst.rotation = actor.get('rotation');
    inst.scale.set(actor.get('scale.x'), actor.get('scale.y'));
    inst.position.set(actor.get('position.x'), actor.get('position.y'));
    // Animation attributes
    inst.anchor.set(actor.get('anchor.x'), actor.get('anchor.y'));
    inst.animationSpeed = actor.get('speed');
    inst.loop = actor.get('loop');
  },
  syncSpriteInst: function(actor, inst) {
    // Actor attributes
    inst.alpha = actor.get('alpha');
    inst.rotation = actor.get('rotation');
    inst.scale.set(actor.get('scale.x'), actor.get('scale.y'));
    inst.position.set(actor.get('position.x'), actor.get('position.y'));
    // Sprite attributes
    inst.anchor.set(actor.get('anchor.x'), actor.get('anchor.y'));
  },
  syncTilingSpriteInst: function(actor, inst) {
    // Actor attributes
    inst.alpha = actor.get('alpha');
    inst.rotation = actor.get('rotation');
    inst.width = actor.get('width');
    inst.height = actor.get('height');
    inst.position.set(actor.get('position.x'), actor.get('position.y'));
    // TilingSprite attributes
    inst.anchor.set(actor.get('anchor.x'), actor.get('anchor.y'));
  }
});
