import Ember from 'ember';
import layout from '../templates/components/actor-inspector';

export default Ember.Component.extend({
  layout: layout,
  classNames: ['actor-inspector'],

  editable: true,

  actions: {
    confirmChange: function() {
      this.sendAction('updateActorProperty', this.get('model'));
    }
  }
});
