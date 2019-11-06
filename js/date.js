
define([ "jquery", "options" ], function( $, options ) {

    "use strict";

    function format( value ) {
        if ( value < 10 ) {
            return "0" + value;
        }
        return value;
    }

    return {
        Toggle: function( type ) {
            if ( type == "show" ) {
                $( "#time" ).fadeIn( 500 );
                var date = new Date(),
                    time = new Date().toLocaleString('en-US',{ hour12: options.Storage.db.hour12 }).replace( /[\d/,]+ /i, '' ).replace( /:\d+( AM| PM)?$/i, '' );

                // set date
                $( "#time" ).attr("data-balloon", date.getFullYear() + "-" + ( date.getUTCMonth() + 1 ) + "-" + date.getDate() );

                // set time
                var sufix = '';
                if ( options.Storage.db.hour12 ) {
                    sufix = new Date().getHours() > 11 ? ' PM' : ' AM';
                }
                $( "#time" ).text( time + sufix );
                setInterval(function() {
                    time = new Date().toLocaleString('en-US',{ hour12: options.Storage.db.hour12 }).replace( /[\d/,]+ /i, '' ).replace( /:\d+( AM| PM)?$/i, '' );
                    var sufix = '';
                    if ( options.Storage.db.hour12 ) {
                        sufix = new Date().getHours() > 11 ? ' PM' : ' AM';
                    }
                    $( "#time" ).text( time + sufix );
                }, 1000 * 30 );
            }
            else {
                $( "#time" ).fadeOut( 500 );
            }
        },

        Today: function () {
            var date = new Date();
            return date.getFullYear() + "" + format( date.getUTCMonth() + 1 ) + "" + format( date.getUTCDate());
        },

        Now: function () {
            var date = new Date();
            return date.getFullYear() + "" + format( date.getUTCMonth() + 1 ) + "" + format( date.getUTCDate()) + "" + format( date.getHours()) + "" + format( date.getMinutes()) + "" + format( date.getSeconds());
        },

        IsNewDay: function( newday, isupdate ) {
            var today = localStorage["simptab-today"];
            if( isupdate ) localStorage["simptab-today"] = newday;
            return today && today === newday ? false : true;
        },

        TimeDiff: function( d1 ) {
            var d2 = new Date().getTime();
            d1     = d1 ? d1 : new Date().getTime();
            return ( d2 - d1 ) / ( 1000 * 60 );
        }
    };
});
