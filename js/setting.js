
define([ "jquery", "waves", "i18n", "zen", "permissions", "options", "mousetrap", "guide" ], function( $, Waves, i18n, zen, permissions, options, Mousetrap, guide ) {

    "use strict";

    var setting = (function () {

        // private
        // [ "0:false", "1:false", "2:false", "3:false", "4:false", "5:false", "6:false", "7:false", "8:false" ]
        var defaultOrigins = (function() {
            var origins = [];
            $( ".originstate" ).children().each( function( idx ) {
                var suff = ( idx == 9 || idx == 10 || idx == 12 || idx == 13 ) ? ":true" : ":false";
                origins.push( idx + suff );
            });
            return origins;
        })();

        var origins = ( function() {
            try {
                var origins = JSON.parse(localStorage["simptab-background-origin"] || "[]" );
            }
            catch ( error ) {
                origins = defaultOrigins;
            }
            return origins;
        })();

        function getOrigins() {
            var len = origins.length;
            if ( defaultOrigins.length > len ) {
                for( var i = 0; i < defaultOrigins.length - len; i++ ) {
                    origins.splice( origins.length, 0, defaultOrigins[origins.length] );
                }
            }
            else if ( defaultOrigins.length < len ) {
                origins = origins.slice( 0, defaultOrigins.length );
            }

            if ( localStorage["simptab-background-origin"] != JSON.stringify( origins )) localStorage["simptab-background-origin"] = JSON.stringify( origins );

            return origins;
        }

        function getLS( mode ) {
            if ( !localStorage[mode] ) localStorage[mode] = "";
            return localStorage[mode];
        }

        function getModes( modes ) {
            var mode;
            Object.keys( modes ).forEach( function( item ) {
                mode = modes[item];
                if ( !mode.value ||
                     mode.vals.filter( function(element) { return mode.value == element ? true : false; }).length == 0
                   ) {
                    mode.value = mode.vals[mode.default];
                    localStorage[mode.type] = mode.value;
                }
            });
            return modes;
        }

        function Setting() {

            this.origins = getOrigins();

            this.mode = getModes({
                "changestate" : {
                    value  : getLS( "simptab-background-mode" ),
                    type   : "simptab-background-mode",
                    vals   : [ "day", "time", "none", "earth" ],
                    default: 1
                },
                "positionstate" : {
                    value  : getLS( "simptab-background-position" ),
                    type   : "simptab-background-position",
                    vals   : [ "center", "corner", "mask" ],
                    default: 1
                },
                "clockstate" : {
                    value  : getLS( "simptab-background-clock" ),
                    type   : "simptab-background-clock",
                    vals   : [ "show", "hide" ],
                    default: 0
                },
                "tsstate"  : {
                    value  : getLS( "simptab-topsites" ),
                    type   : "simptab-topsites",
                    vals   : [ "normal", "simple", "senior" ],
                    default: 1
                },
                //"pinstate"  : {
                //    value  : getLS( "simptab-pin" ),
                //    type   : "simptab-pin",
                //    vals   : [ "30", "60", "120", "240", "480" ],
                //    default: 0
                //}
            });

        }

        Setting.prototype.UpdateMode = function( type, mode ) {
            this.mode[type].value = mode;
            localStorage[ this.mode[type].type ] = mode;
        }

        Setting.prototype.UpdateOriginsMode = function( idx, value ) {
            this.origins.splice( idx, 1, idx + ":" + value );
            localStorage["simptab-background-origin"] = JSON.stringify( this.origins );
        }

        return new Setting();
    })();

    function updateRdState( selector, mode ) {
        var $item, $parent, $span, cls;
        $( "." + selector ).find( "input" ).each( function( idx, item ) {
            $item   = $(item);
            $parent = $item.parent();
            $span   = $parent.find("span");
            cls     = selector != "pinstate" ? "lineradio" : "boxradio";

            if ( $item.val() == mode ) {
                $item.attr( "checked", true     );
                $item.prev().attr( "class", "checked" );
                $parent.attr( "class", cls + " lrselected" );
                $span.length ? $($span).attr( "class", "checked" ) : $parent.prepend( '<span class="checked"></span>' );
            }
            else {
                $item.attr( "checked", false             );
                $item.prev().attr( "class", "unchecked"  );
                $parent.attr( "class", cls );
                $span.length ? $($span).attr( "class", "unchecked" ) : $parent.prepend( '<span class="unchecked"></span>' );
            }
        });
    }

    function updateCkState( item ) {
        var idx     = item.split(":")[0],
            value   = item.split(":")[1],
            $target = $($(".originstate").children()[idx]),
            cls     = "lineradio",
            checked = "unchecked",
            span    = '<span class="unchecked"></span>';

        if ( value === "true" ) {
            cls     = "lineradio lrselected";
            checked = "checked";
            span    = '<span class="checked"></span>'
        }

        $target.attr("class", cls );
        $target.find("input").val( value );
        $target.find("span").remove();
        $target.prepend( span );
    }

    function updateOriginsVisible() {
        localStorage["simptab-background-mode"] == "day" ? $(".originstate").fadeOut() : $(".originstate").fadeIn();
    }

    function bookmarksPermissions() {
        permissions.Verify( [ 'bookmarks' ], function( result ) {
            var $target = $( ".bmstate .lineradio" ), span;
            if ( result ) {
                span = '<span class="checked"></span>';
                localStorage["simptab-bookmarks"] = "true";
                $target.addClass( "lrselected" );
            } else {
                localStorage["simptab-bookmarks"] = "false";
                span = '<span class="unchecked"></span>';
                $target.removeClass( "lrselected" );
            }
            $target.find( "input" ).val( result );
            $target.prepend( span );
        });
    }

    function setbookmarksPermissions( type ) {
        if ( type == "true" ) {
            permissions.Request([ 'bookmarks' ], function( result ) {
                //TO-DO
            });
        } else {
            permissions.Remove([ 'bookmarks' ], function( result ) {
                //TO-DO
            });
        }
    }

    function zendmodeState() {
        var zen = localStorage["simptab-zenmode"] || "false",
            $target = $( ".zenstate .lineradio" ), span;
        if ( zen == "true" ) {
            span = '<span class="checked"></span>';
            $target.addClass( "lrselected" );
        } else {
            localStorage["simptab-zenmode"] = "false";
            span = '<span class="unchecked"></span>';
            $target.removeClass( "lrselected" );
        }
        $target.find( "input" ).val( zen );
        $target.prepend( span );
    }

    function autoState() {
        var message = options.Storage.db.carousel == -1 ? i18n.GetLang( "options_carousel_value_1" ) : i18n.GetLang( "options_carousel_value_" + options.Storage.db.carousel ),
            suffix  = options.Storage.db.carousel == -1 ? "" : i18n.GetLang( "options_carousel_value_suffix" ),
            html    = '<div class="downlist">\
                        <span class="list-field" value="-1">' + i18n.GetLang( "options_carousel_value_1" )  + '</span>\
                        <span class="list-field" value="5">'  + i18n.GetLang( "options_carousel_value_5" )  + '</span>\
                        <span class="list-field" value="10">' + i18n.GetLang( "options_carousel_value_10" ) + '</span>\
                        <span class="list-field" value="30">' + i18n.GetLang( "options_carousel_value_30" ) + '</span>\
                        <span class="list-field" value="60">' + i18n.GetLang( "options_carousel_value_60" ) + '</span>\
                      </div>';
        $( ".autostate" ).append( html ).find( "label" ).text( i18n.GetLang( "options_custom_unsplash" ) + message + suffix );
        $( ".autostate .downlist .list-field[value=" + options.Storage.db.carousel + "]" ).addClass( "lrselected" );
        $( ".autostate .dropdown" ).on( "click", function() {
            $( ".autostate .downlist" ).addClass( "show" );
        });
        $( ".autostate .downlist .list-field" ).on( "click", function( event ) {
            const $target = $( event.currentTarget ),
                  value   = $target.attr( "value" ),
                  text    = $target.text();
            $( ".autostate .downlist .list-field" ).removeClass( "lrselected" );
            $target.addClass( "lrselected" );
            options.Storage.db.carousel = value;
            options.Storage.Set();
            $( ".autostate .downlist" ).removeClass( "show" );
            var suffix = value == -1 ? "" : i18n.GetLang( "options_carousel_value_suffix" );
            $( ".autostate .dropdown label" ).text( i18n.GetLang( "options_custom_unsplash" ) + text + suffix );
        });
    }

    function pinState() {
        localStorage["simptab-pin"] == undefined && localStorage.setItem( "simptab-pin", 30 );
        var ls      = localStorage["simptab-pin"],
            message = i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", ls / 60 ),
            html    = '<div class="downlist">\
                        <span class="list-field" value="30">'  + i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", "0.5" )  + '</span>\
                        <span class="list-field" value="60">'  + i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", "1" )  + '</span>\
                        <span class="list-field" value="120">' + i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", "2" ) + '</span>\
                        <span class="list-field" value="240">' + i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", "4" ) + '</span>\
                        <span class="list-field" value="480">' + i18n.GetLang( "setting_pin_tooltip" ).replace( "#1", "8" ) + '</span>\
                      </div>';
        $( ".pinstate" ).append( html ).find( "label" ).text( i18n.GetLang( "options_custom_unsplash" ) + message );
        $( ".pinstate .downlist .list-field[value=" + ls + "]" ).addClass( "lrselected" );
        $( ".pinstate .dropdown" ).on( "click", function() {
            $( ".pinstate .downlist" ).addClass( "show" );
        });
        $( ".pinstate .downlist .list-field" ).on( "click", function( event ) {
            const $target = $( event.currentTarget ),
                  value   = $target.attr( "value" ),
                  text    = $target.text();
            $( ".pinstate .downlist .list-field" ).removeClass( "lrselected" );
            $target.addClass( "lrselected" );
            localStorage["simptab-pin"] = value;
            $( ".pinstate .downlist" ).removeClass( "show" );
            $( ".pinstate .dropdown label" ).text( i18n.GetLang( "options_custom_unsplash" ) + text );
        });
    }

    function otherState() {
        $( ".otherstate label" ).on( "click", function( event ) {
            const $target = $( event.currentTarget ),
                  id      = $target.attr( "for" );
            if ( id == "shortcuts" ) {
                Mousetrap.trigger( "?" );
            } else if ( id == "help" ) {
                guide.Render( "all", true );
            } else $( ".controlbar" ).find( "a[url=" + id + "]" ).click();
        });
    }

    function hiddenState() {
        if ( localStorage["simptab-background-mode"] != "earth" ) return;
        //$( ".originstate, .autostate" ).append( '<div class="hidden"></div>' ).css({ position: "relative" });
        $( $( ".changestate" ).children()[0] ).append( '<div class="hidden" style="left:0;right:0;top:0"></div>' ).css({ position: "relative" });
        $( $( ".changestate" ).children()[2] ).append( '<div class="hidden" style="left:0;right:0;top:0"></div>' ).css({ position: "relative" });
        $( $( ".autostate"  ) ).append( '<div class="hidden"></div>' ).css({ position: "relative" });
    }

    return {
        Init: function() {

            // set settin width
            var width = parseInt( i18n.GetSettingWidth() );
            $( ".setting" ).width( width ).css({ "transform": "translateX(" + width + "px)"});

            // update [ changestate, clockstate, positionstate, topsites, pinstate ] radio button
            Object.keys( setting.mode ).forEach( function( item ) {
                updateRdState( item, setting.mode[item].value );
            });

            // update originstate lineradio
            setting.origins.forEach( function( item ) {
                updateCkState( item );
            });

            // update originsstate visible
            updateOriginsVisible();

            // bookmarks permissions checked
            bookmarksPermissions();

            // zen mode checked
            zendmodeState();

            // auto changed backgrounds
            autoState();

            // pin state
            pinState();

            // ohter state
            otherState();

            hiddenState();
        },

        Listen: function ( callback ) {

            // listen [ changestate, clockstate, topsites, pinstate ] radio button event
            var selectors = Object.keys( setting.mode ).map( function( item ) { return "." + item + " input"; } );
            $( selectors.join( "," ) ).click( function( event ) {
                var type = event.target.name,
                    mode = event.target.value;

                updateRdState(      type, mode );
                setting.UpdateMode( type, mode );
                updateOriginsVisible();

                // callback only include: tsstate, clockstate
                callback( type, mode );
            });

            // listen originstate checkbox button event
            $( ".originstate input" ).click( function( event ) {
                var idx     = event.target.name,
                    value   = event.target.value == "true" ? "false" : "true";
                updateCkState( idx + ":" + value );
                setting.UpdateOriginsMode( idx, value );
                if ( idx == "10" && value == "true" ) {
                    localStorage["simptab-favorite-notify"] != "false" &&
                    new Notify().Render({ content: i18n.GetLang( "tips_favorite" ), action: i18n.GetLang( "tips_confirm" ), callback:function (){
                        localStorage["simptab-favorite-notify"] = false;
                    }});
                }
            });

            // listen originstate checkbox button event
            $( ".bmstate input" ).click( function( event ) {
                var $target = $( event.target ).parent(),
                    $span   = $target.find( "span" ),
                    value   = event.target.value == "false" ? "true" : "false";
                if ( value == "true" ) {
                    $span.removeAttr( "class" ).addClass( "checked" );
                    $target.addClass( "lrselected" );
                } else {
                    $span.removeAttr( "class" ).addClass( "unchecked" );
                    $target.removeClass( "lrselected" );
                }
                event.target.value = value;
                setbookmarksPermissions( value );
            });

            // listen originstate checkbox button event
            $( ".zenstate input" ).click( function( event ) {
                var $target = $( event.target ).parent(),
                    $span   = $target.find( "span" ),
                    value   = event.target.value == "false" ? "true" : "false";
                if ( value == "true" ) {
                    $span.removeAttr( "class" ).addClass( "checked" );
                    $target.addClass( "lrselected" );
                    zen.Init();
                    new Notify().Render( i18n.GetLang( "notify_zen_mode" ) );
                    setTimeout( function() { location.reload(); }, 2000 );
                } else {
                    $span.removeAttr( "class" ).addClass( "unchecked" );
                    $target.removeClass( "lrselected" );
                    zen.Exit();
                }
                localStorage["simptab-zenmode"] = value;
                event.target.value = value;
            });

            $( ".lineradio" ).on( "click", function( event ) { Waves.attach( '.lineradio', ['waves-block'] ); });
            $( ".boxradio"  ).on( "click", function( event ) { Waves.attach( '.boxradio',  ['waves-block'] ); });
            // listen span click event
            $( ".lineradio" ).on( "click", "span", function( event ) { $(this).next().click(); });
            // hack code by label(maskralig)
            $( ".lineradio" ).find( "label[for=maskralig]" ) .on( "click", function( event ) { $(this).prev().click(); });
        },

        Mode: function( type ) {
            return setting.mode[type].value;
        },

        IsRandom: function() {
            return setting.mode["changestate"].value === "time" ? true : false;
        },

        Verify: function( idx ) {
            var value = setting.origins[idx],
                value = value || idx + ":" + "true";

            return value.split(":")[1];
        },

        EmptyOrigins: function() {
            var empty = true;
            setting.origins.forEach( function( origin, idx ) {
                if ( origin.endsWith( "true" ) && ( idx != 3 && idx != 5 && idx != 8 && idx != 11 ) ) {
                    empty = false;
                }
            });
            return empty;
       },

        TogglePinState: function( state ) {
            state ? $( ".pinstate" ).fadeIn() : $( ".pinstate" ).fadeOut();
        }

    };
});
