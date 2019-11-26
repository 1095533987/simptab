
define([ "jquery", "i18n", "setting", "vo", "date", "error", "cdns", "options", "notify" ], function( $, i18n, setting, vo, date, SimpError, cdns, options, notify ) {

    "use strict";

    var deferred      = new $.Deferred(),
        SIMP_API_HOST = "http://st.ksria.cn/",
        apis          = (function( $, IsNewDay, Today, isHoliday, IsRandom, Verify, EmptyOrigins ) {

            /*
            *
            * apis.New() and apis.Update() must be both pairs appear.
            * apis.New()    set vo `code` and `origin` property.
            * apis.Update() set vo other property.
            *
            * dataType: json, xml( only nasa ), localStorage( upload  ), image( "wallhaven.cc", "unsplash.com", "unsplash.it" )
            */

            var options = {
                version  : 1,
                url      : "",
                type     : "GET",
                dataType : "json",
                timeout  : 2000,
                method   : "",
                origin   : "",
                code     : 0
            };

            function APIS() {
                this.vo     = {};
                this.failed = 0;
            }

            APIS.prototype.Stack       = {};
            APIS.prototype.ORIGINS     = [ "wallhaven.cc", "unsplash.com", "unsplash.it", "flickr.com", "googleart.com", "500px.com", "desktoppr.co", "visualhunt.com", "nasa.gov", "special", "favorite", "holiday", "bing.com", "today" ],
            APIS.prototype.ORIGINS_MAX = APIS.prototype.ORIGINS.length;

            APIS.prototype.Random = function( min, max ) {
                return Math.floor( Math.random() * ( max - min + 1 ) + min );
            }

            APIS.prototype.New = function() {
                var is_today = false,
                    code     = this.Random( 0, this.ORIGINS_MAX - 1 );
                this.defer   = new $.Deferred();

                // verify background every day && is today is new day
                // Verify( 13 ) == true && background every time && today is new day
                if ( EmptyOrigins() ) {
                    new SimpError( "empty code", "Not selected any origins" );
                    return;
                }
                if ( IsNewDay( Today(), true ) ) { is_today = true; }
                if ( ( is_today && !IsRandom() ) || 
                     ( is_today &&  IsRandom() && Verify( 13 ) == "true" ) ) {
                    code = 13;
                }
                // verify today is holiday
                else if ( isHoliday() ) {
                    code = 11;
                }
                // change background every time
                else {
                    while ( Verify( code ) == "false"  ||
                            //localStorage[ "simptab-prv-code" ] == code ||
                            // hiden origins include: flickr 500px nasa holiday
                            code == 3 || code == 5 || code == 8 || code == 11 || code == 13 ) {
                        code = this.Random( 0, this.ORIGINS_MAX - 1 );
                    }
                    //localStorage[ "simptab-prv-code" ] = code;
                }
                //code == this.ORIGINS_MAX && ( code = EmptyOrigins() );

                // add test code
                // code = 9;

                console.log( "=== Current background origin is: ", code, this.ORIGINS[code] );
                this.vo        = $.extend( {}, options );
                this.vo.code   = code;
                this.vo.origin = this.ORIGINS[code];
                return { code: this.vo.code, origin: this.vo.origin };
            }

            APIS.prototype.Update = function() {
                var obj = arguments && arguments.length > 0 && arguments[0],
                    me  = this;
                Object.keys( obj ).forEach( function( item ) { me.vo[item] = obj[item]; });
            }

            APIS.prototype.Remote = function( callBack ) {
                var me     = this,
                    random = arguments && arguments.length == 1 ? "?random=" + Math.round(+new Date()) : "";
                $.ajax({
                    type       : this.vo.type,
                    timeout    : 0, // this.vo.timeout
                    url        : this.vo.url + random,
                    dataType   : this.vo.dataType
                }).then( function( result ) {
                    me.VerifyObject( result ) && callBack( result );
                } , function( jqXHR, textStatus, errorThrown ) {
                    me.defer.reject( new SimpError( "apis:Remote()", "Call remote api error.", { jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown, apis_vo : me.vo }));
                });
            }

            APIS.prototype.VerifyObject = function( result ) {
                if ( typeof result != "undefined" && !$.isEmptyObject( result )) {
                    return true;
                }
                else {
                    this.defer.reject( new SimpError( "apis.VerifyObject()", "Current data structure error.", { result : result, apis_vo : apis.vo }));
                    return false;
                }
            }

            return new APIS;
    })( jQuery, date.IsNewDay, date.Today, isHoliday, setting.IsRandom, setting.Verify, setting.EmptyOrigins );

    /*
    * Bing( today )
    */
    apis.Stack[ apis.ORIGINS[13] ] = function() {
        console.log( "=== Bing.com today ===");
        var local = i18n.GetLocale() == "zh_CN" ? "cn." : "";
        apis.Update({ url : "https://" + local + "bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", method : "apis.todayBing()" });
        apis.Remote( function( result ) {
            try {
                var data = result.images[0],
                    url  = data.url,
                    hdurl= getHDurl( getTrueUrl( url )),
                    name = data.copyright,
                    info = getInfo( data.copyrightlink ),
                    enddate   = data.enddate,
                    shortname = "Bing.com Image-" + getShortName( info );
                apis.defer.resolve( url, hdurl, name, info, enddate, shortname, apis.vo.origin, apis.vo );
            }
            catch ( error ) {
                apis.defer( new SimpError( apis.vo.method, "Parse bing.com/HPImageArchive.aspx error.", apis.vo ), error );
            }
        }, false );
        return apis.defer.promise();
    }

    function getHDurl( url ) {
        return url.replace( "1366x768", "1920x1080" );
    }

    function getTrueUrl( url ) {
        if ( url.indexOf( "/" ) == 0 ) {
            return "http://www.bing.com" + url;
        }
        return url;
    }

    function getInfo( url ) {
        var reg = /http:\/\/[A-Za-z0-9\.-]{3,}\.[A-Za-z]{3}/;
        if( !reg.test( url )) {
            return "#";
        }

        return url.replace( "&mkt=zh-cn", "" ).replace( "&form=hpcapt", "" ).replace( "www.bing.com", "www.bing.com/knows" );
    }

    function getShortName( shortname ) {

        shortname = shortname.replace( "www.bing.com/knows", "" )
                             .replace( "http://", "" )
                             .replace( "https://", "" )
                             .replace( "/search?q=", "" );
        shortname = shortname.split( "+" )[0];
        shortname = shortname.split( "&" )[0];

        return decodeURIComponent( shortname );
    }

    /*
    * Bing( random )
    */
    apis.Stack[ apis.ORIGINS[12] ] = function() {
        console.log( "=== Bing.com random ===");
        var bing_ids = ["201911/LouvreAutumn_1920x1080","201911/CrocusSativus_1920x1080","201911/AlbertaOwl_1920x1080","201911/CorkTrees_1920x1080","201911/ChandraTal_1920x1080","201911/MtDiablo_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/LouvreAutumn_1920x1080","201911/Lidong2019_1920x1080","201911/KagamiMirror_1920x1080","201911/BlueberryFrost_1920x1080","201911/MountHowitt_1920x1080","201911/BabyHedgehog_1920x1080","201911/BerlinerMauerFall_1920x1080","201911/BurgTrifels_1920x1080","201911/Murmurations_1920x1080","201911/Nebelmond_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/SimienGelada_1920x1080","201911/BeaujolaisRegion_1920x1080","201911/SaltireClouds_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/AtchafalayaCypress_1920x1080","201911/OverwinteringMonarchs_1920x1080","201911/HairyHighlanders_1920x1080","201911/AlbertaOwl_1920x1080","201911/CorkTrees_1920x1080","201911/ChandraTal_1920x1080","201911/MtDiablo_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/LouvreAutumn_1920x1080","201911/Lidong2019_1920x1080","201911/KagamiMirror_1920x1080","201911/BlueberryFrost_1920x1080","201911/MountHowitt_1920x1080","201911/BabyHedgehog_1920x1080","201911/BerlinerMauerFall_1920x1080","201911/BurgTrifels_1920x1080","201911/Murmurations_1920x1080","201911/Nebelmond_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/SimienGelada_1920x1080","201911/BeaujolaisRegion_1920x1080","201911/SaltireClouds_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/AtchafalayaCypress_1920x1080","201911/OverwinteringMonarchs_1920x1080","201911/HairyHighlanders_1920x1080","201910/NationalDay70_1920x1080","201910/TrossachsAutumn_1920x1080","201910/AdelieBreeding_1920x1080","201910/JupiterJunoCam_1920x1080","201910/TinternAbbey_1920x1080","201910/MarlboroughSounds_1920x1080","201910/GreaterFlamingo_1920x1080","201910/WorldOctopus_1920x1080","201910/GrandCanyonEast_1920x1080","201910/BubbleNebula_1920x1080","201910/RedRocksArches_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/CompressionFossil_1920x1080","201910/AlbertaThanksgiving_1920x1080","201910/MaldivesDragonfly_1920x1080","201910/AcadiaBlueberries_1920x1080","201910/LeavesGoldfish_1920x1080","201910/UncompahgreForest_1920x1080","201910/HalfMoonBayPumpkin_1920x1080","201910/PaleSloth_1920x1080","201910/MistyAshdown_1920x1080","201910/CrabAppleBlackbird_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/CountyBridge_1920x1080","201910/WorldLemurDay_1920x1080","201910/RedWattlebird_1920x1080","201910/NaranjoBulnes_1920x1080","201910/FortRockHomestead_1920x1080","201910/EidolonHelvum_1920x1080","201910/CharlesNight_1920x1080","201910/VampireCastle_1920x1080","201910/NationalDay70_1920x1080","201910/TrossachsAutumn_1920x1080","201910/AdelieBreeding_1920x1080","201910/JupiterJunoCam_1920x1080","201910/TinternAbbey_1920x1080","201910/MarlboroughSounds_1920x1080","201910/GreaterFlamingo_1920x1080","201910/WorldOctopus_1920x1080","201910/GrandCanyonEast_1920x1080","201910/BubbleNebula_1920x1080","201910/RedRocksArches_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/CompressionFossil_1920x1080","201910/AlbertaThanksgiving_1920x1080","201910/MaldivesDragonfly_1920x1080","201910/AcadiaBlueberries_1920x1080","201910/LeavesGoldfish_1920x1080","201910/UncompahgreForest_1920x1080","201910/HalfMoonBayPumpkin_1920x1080","201910/PaleSloth_1920x1080","201910/MistyAshdown_1920x1080","201910/CrabAppleBlackbird_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/CountyBridge_1920x1080","201910/WorldLemurDay_1920x1080","201910/RedWattlebird_1920x1080","201910/NaranjoBulnes_1920x1080","201910/FortRockHomestead_1920x1080","201910/EidolonHelvum_1920x1080","201910/CharlesNight_1920x1080","201910/VampireCastle_1920x1080","201909/Castelbouc_1920x1080","201909/RamsauWimbachklamm_1920x1080","201909/SquirrelHeather_1920x1080","201909/AutumnTreesNewEngland_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/ArroyoGrande_1920x1080","201909/TsavoGerenuk_1920x1080","201909/DaintreeRiver_1920x1080","201909/MilkyWayCanyonlands_1920x1080","201909/midmoon_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/SurfboardRow_1920x1080","201909/Wachsenburg_1920x1080","201909/StokePero_1920x1080","201909/SunbeamsForest_1920x1080","201909/CommonLoon_1920x1080","201909/SanSebastianFilm_1920x1080","201909/WallofPeace_1920x1080","201909/VancouverFall_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/ThePando_1920x1080","201909/BardenasDesert_1920x1080","201909/BloomingJacaranda_1920x1080","201909/ClavijoLandscape_1920x1080","201909/CrimsonRosella_1920x1080","201909/Castelbouc_1920x1080","201909/RamsauWimbachklamm_1920x1080","201909/SquirrelHeather_1920x1080","201909/AutumnTreesNewEngland_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/ArroyoGrande_1920x1080","201909/TsavoGerenuk_1920x1080","201909/DaintreeRiver_1920x1080","201909/MilkyWayCanyonlands_1920x1080","201909/midmoon_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/SurfboardRow_1920x1080","201909/Wachsenburg_1920x1080","201909/StokePero_1920x1080","201909/SunbeamsForest_1920x1080","201909/CommonLoon_1920x1080","201909/SanSebastianFilm_1920x1080","201909/WallofPeace_1920x1080","201909/VancouverFall_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/ThePando_1920x1080","201909/BardenasDesert_1920x1080","201909/BloomingJacaranda_1920x1080","201909/ClavijoLandscape_1920x1080","201909/CrimsonRosella_1920x1080","201908/LavaFlows_1920x1080","201908/CrummockWater_1920x1080","201908/UhuRLP_1920x1080","201908/SwiftFox_1920x1080","201908/ApostleIslands_1920x1080","201908/WhiteStorksNest_1920x1080","201908/qixi_1920x1080","201908/LinyantiLeopard_1920x1080","201908/KluaneAspen_1920x1080","201908/TrianaBridge_1920x1080","201908/TRNPThunderstorm_1920x1080","201908/AmboseliHerd_1920x1080","201908/MartianSouthPole_1920x1080","201908/HornedAnole_1920x1080","201908/SmogenSweden_1920x1080","201908/GoldRushYukon_1920x1080","201908/DrinkingNectar_1920x1080","201908/MagdalenCave_1920x1080","201908/Feringasee_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/FarmlandLandscape_1920x1080","201908/AugustBears_1920x1080","201908/WinnatsPass_1920x1080","201908/ParrotsIndia_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/HardeeCoFair_1920x1080","201908/AsburyParkNJ_1920x1080","201908/Slackers_1920x1080","201908/LavaFlows_1920x1080","201908/CrummockWater_1920x1080","201908/UhuRLP_1920x1080","201908/SwiftFox_1920x1080","201908/ApostleIslands_1920x1080","201908/WhiteStorksNest_1920x1080","201908/qixi_1920x1080","201908/LinyantiLeopard_1920x1080","201908/KluaneAspen_1920x1080","201908/TrianaBridge_1920x1080","201908/TRNPThunderstorm_1920x1080","201908/AmboseliHerd_1920x1080","201908/MartianSouthPole_1920x1080","201908/HornedAnole_1920x1080","201908/SmogenSweden_1920x1080","201908/GoldRushYukon_1920x1080","201908/DrinkingNectar_1920x1080","201908/MagdalenCave_1920x1080","201908/Feringasee_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/FarmlandLandscape_1920x1080","201908/AugustBears_1920x1080","201908/WinnatsPass_1920x1080","201908/ParrotsIndia_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/HardeeCoFair_1920x1080","201908/AsburyParkNJ_1920x1080","201908/Slackers_1920x1080","201907/HKreuni_1920x1080","201907/BailysBeads_1920x1080","201907/Transfagarasan_1920x1080","201907/SalcombeDevon_1920x1080","201907/PeelCastle_1920x1080","201907/SommerCalviCorsica_1920x1080","201907/WesternArcticHerd_1920x1080","201907/ChefchaouenMorocco_1920x1080","201907/JaguarPantanal_1920x1080","201907/KingsWalkway_1920x1080","201907/IndiaLitSpace_1920x1080","201907/NightofNights_1920x1080","201907/CradleMountain_1920x1080","201907/WaterperryGardens_1920x1080","201907/Ushitukiiwa_1920x1080","201907/VulpesVulpes_1920x1080","201907/Narrenmuehle_1920x1080","201907/LeatherbackTT_1920x1080","201907/GodsGarden_1920x1080","201907/MiquelonPanorama_1920x1080","201907/BuckinghamSummer_1920x1080","201907/SardiniaHawkMoth_1920x1080","201907/Skywalk_1920x1080","201907/MeerkatMob_1920x1080","201907/CathedralMountBuffalo_1920x1080","201907/ElkFallsBridge_1920x1080","201907/CahuitaNP_1920x1080","201907/PuffinSkomer_1920x1080","201907/TrilliumLake_1920x1080","201907/TortoiseMigration_1920x1080","201907/TreeTower_1920x1080","201907/HKreuni_1920x1080","201907/BailysBeads_1920x1080","201907/Transfagarasan_1920x1080","201907/SalcombeDevon_1920x1080","201907/PeelCastle_1920x1080","201907/SommerCalviCorsica_1920x1080","201907/WesternArcticHerd_1920x1080","201907/ChefchaouenMorocco_1920x1080","201907/JaguarPantanal_1920x1080","201907/KingsWalkway_1920x1080","201907/IndiaLitSpace_1920x1080","201907/NightofNights_1920x1080","201907/CradleMountain_1920x1080","201907/WaterperryGardens_1920x1080","201907/Ushitukiiwa_1920x1080","201907/VulpesVulpes_1920x1080","201907/Narrenmuehle_1920x1080","201907/LeatherbackTT_1920x1080","201907/GodsGarden_1920x1080","201907/MiquelonPanorama_1920x1080","201907/BuckinghamSummer_1920x1080","201907/SardiniaHawkMoth_1920x1080","201907/Skywalk_1920x1080","201907/MeerkatMob_1920x1080","201907/CathedralMountBuffalo_1920x1080","201907/ElkFallsBridge_1920x1080","201907/CahuitaNP_1920x1080","201907/PuffinSkomer_1920x1080","201907/TrilliumLake_1920x1080","201907/TortoiseMigration_1920x1080","201907/TreeTower_1920x1080","201906/HighTrestleTrail_1920x1080","201906/BassRock_1920x1080","201906/HeligolandSealPup_1920x1080","201906/VastPalmGrove_1920x1080","201906/PeruvianRainforest_1920x1080","201906/MulberryArtificialHarbour_1920x1080","201906/dragonboat_1920x1080","201906/Biorocks_1920x1080","201906/OntWarbler_1920x1080","201906/PontadaPiedade_1920x1080","201906/FujiSakura_1920x1080","201906/RioGrande_1920x1080","201906/SainteVictoireCezanneBirthday_1920x1080","201906/TreeFrog_1920x1080","201906/SaskFlowers_1920x1080","201906/PantheraLeoDad_1920x1080","201906/AlaskaEagle_1920x1080","201906/HelixPomatia_1920x1080","201906/CherryLaurelMaze_1920x1080","201906/CommonSundewVosges_1920x1080","201906/HawksbillCrag_1920x1080","201906/ManausBasin_1920x1080","201906/Gnomesville_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/Montreux_1920x1080","201906/BurrowingOwlet_1920x1080","201906/RedAnthiasCoralMayotte_1920x1080","201906/HighTrestleTrail_1920x1080","201906/BassRock_1920x1080","201906/HeligolandSealPup_1920x1080","201906/VastPalmGrove_1920x1080","201906/PeruvianRainforest_1920x1080","201906/MulberryArtificialHarbour_1920x1080","201906/dragonboat_1920x1080","201906/Biorocks_1920x1080","201906/OntWarbler_1920x1080","201906/PontadaPiedade_1920x1080","201906/FujiSakura_1920x1080","201906/RioGrande_1920x1080","201906/SainteVictoireCezanneBirthday_1920x1080","201906/TreeFrog_1920x1080","201906/SaskFlowers_1920x1080","201906/PantheraLeoDad_1920x1080","201906/AlaskaEagle_1920x1080","201906/HelixPomatia_1920x1080","201906/CherryLaurelMaze_1920x1080","201906/CommonSundewVosges_1920x1080","201906/HawksbillCrag_1920x1080","201906/ManausBasin_1920x1080","201906/Gnomesville_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/Montreux_1920x1080","201906/BurrowingOwlet_1920x1080","201906/RedAnthiasCoralMayotte_1920x1080","201905/may1_1920x1080","201905/RuffLek_1920x1080","201905/MargaretRiverVineyards_1920x1080","201905/SkelligMichael_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/NCFireweed_1920x1080","201905/StMaryFalls_1920x1080","201905/LightHouseNS_1920x1080","201905/SerengetiZebra_1920x1080","201905/ChannelIslandFox_1920x1080","201905/ZaanseSchans_1920x1080","201905/PipingPlover_1920x1080","201905/PineLogSP_1920x1080","201905/BlueCannes_1920x1080","201905/JasperCub_1920x1080","201905/xiaoicepainting_1920x1080","201905/BicycleRelief_1920x1080","201905/BluebellBeech_1920x1080","201905/Ghyakar_1920x1080","201905/BeeWeek_1920x1080","201905/CRDelta_1920x1080","201905/SeaCliffBridge_1920x1080","201905/CuracaoTurtle_1920x1080","201905/MacmillanForest_1920x1080","201905/CapeMayWarbler_1920x1080","201905/MarathonduMont_1920x1080","201905/PittingGalesPoint_1920x1080","201905/NFLDfog_1920x1080","201905/BlumenwieseNRW_1920x1080","201905/Manhattanhenge_1920x1080","201905/ZumwaltPrairie_1920x1080","201905/may1_1920x1080","201905/RuffLek_1920x1080","201905/MargaretRiverVineyards_1920x1080","201905/SkelligMichael_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/NCFireweed_1920x1080","201905/StMaryFalls_1920x1080","201905/LightHouseNS_1920x1080","201905/SerengetiZebra_1920x1080","201905/ChannelIslandFox_1920x1080","201905/ZaanseSchans_1920x1080","201905/PipingPlover_1920x1080","201905/PineLogSP_1920x1080","201905/BlueCannes_1920x1080","201905/JasperCub_1920x1080","201905/xiaoicepainting_1920x1080","201905/BicycleRelief_1920x1080","201905/BluebellBeech_1920x1080","201905/Ghyakar_1920x1080","201905/BeeWeek_1920x1080","201905/CRDelta_1920x1080","201905/SeaCliffBridge_1920x1080","201905/CuracaoTurtle_1920x1080","201905/MacmillanForest_1920x1080","201905/CapeMayWarbler_1920x1080","201905/MarathonduMont_1920x1080","201905/PittingGalesPoint_1920x1080","201905/NFLDfog_1920x1080","201905/BlumenwieseNRW_1920x1080","201905/Manhattanhenge_1920x1080","201905/ZumwaltPrairie_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/BistiBadlands_1920x1080","201904/NelderPlot_1920x1080","201904/NelderPlot_1920x1080","201904/QingmingBridge_1920x1080","201904/ChilehausHH_1920x1080","201904/GTNPBeaver_1920x1080","201904/WallaceMonument_1920x1080","201904/BlueTide_1920x1080","201904/SibWrestling_1920x1080","201904/Bollenstreek_1920x1080","201904/BigWindDay_1920x1080","201904/YukonEmerald_1920x1080","201904/GOTPath_1920x1080","201904/AlpineEucalyptBark_1920x1080","201904/BesenheideBDJ_1920x1080","201904/HopeValley_1920x1080","201904/ChipmunkCheeks_1920x1080","201904/Paepalanthus_1920x1080","201904/CoveSpires_1920x1080","201904/HidingEggs_1920x1080","201904/LaysanAlbatross_1920x1080","201904/CasaBatllo_1920x1080","201904/RainforestMoss_1920x1080","201904/FireIce_1920x1080","201904/CoastalFog_1920x1080","201904/BloomingAloe_1920x1080","201904/SpringBadlands_1920x1080","201904/BabySloth_1920x1080","201904/GlenfinnanViaduct_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/BistiBadlands_1920x1080","201904/NelderPlot_1920x1080","201904/NelderPlot_1920x1080","201904/QingmingBridge_1920x1080","201904/ChilehausHH_1920x1080","201904/GTNPBeaver_1920x1080","201904/WallaceMonument_1920x1080","201904/BlueTide_1920x1080","201904/SibWrestling_1920x1080","201904/Bollenstreek_1920x1080","201904/BigWindDay_1920x1080","201904/YukonEmerald_1920x1080","201904/GOTPath_1920x1080","201904/AlpineEucalyptBark_1920x1080","201904/BesenheideBDJ_1920x1080","201904/HopeValley_1920x1080","201904/ChipmunkCheeks_1920x1080","201904/Paepalanthus_1920x1080","201904/CoveSpires_1920x1080","201904/HidingEggs_1920x1080","201904/LaysanAlbatross_1920x1080","201904/CasaBatllo_1920x1080","201904/RainforestMoss_1920x1080","201904/FireIce_1920x1080","201904/CoastalFog_1920x1080","201904/BloomingAloe_1920x1080","201904/SpringBadlands_1920x1080","201904/BabySloth_1920x1080","201904/GlenfinnanViaduct_1920x1080","201903/PhillisWheatley_1366x768","201903/PhillisWheatley_1366x768","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/ElephantMarch_1366x768","201903/MardiGrasIndians_1366x768","201903/Cefalu_1366x768","201903/BrittlebushBloom_1366x768","201903/Policewomen_1366x768","201903/GrapeHarvest_1366x768","201903/GrapeHarvest_1920x1080","201903/BagpipeOpera_1920x1080","201903/LeopardNamibia_1920x1080","201903/SpainRioTinto_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/ChitalDawn_1920x1080","201903/TaoiseachDept_1920x1080","201903/TofinoCoast_1920x1080","201903/FallasBonfire_1920x1080","201903/EarlyBloomer_1920x1080","201903/springequinox_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/AthensNight_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/AurovilleIndia_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201903/PhillisWheatley_1366x768","201903/PhillisWheatley_1366x768","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/ElephantMarch_1366x768","201903/MardiGrasIndians_1366x768","201903/Cefalu_1366x768","201903/BrittlebushBloom_1366x768","201903/Policewomen_1366x768","201903/GrapeHarvest_1366x768","201903/GrapeHarvest_1920x1080","201903/BagpipeOpera_1920x1080","201903/LeopardNamibia_1920x1080","201903/SpainRioTinto_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/ChitalDawn_1920x1080","201903/TaoiseachDept_1920x1080","201903/TofinoCoast_1920x1080","201903/FallasBonfire_1920x1080","201903/EarlyBloomer_1920x1080","201903/springequinox_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/AthensNight_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/AurovilleIndia_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201902/MinnewankaBoathouse_1366x768","201902/HoaryMarmot_1366x768","201902/JapanCrane_1366x768","201902/newyeareve_1366x768","201902/springfestival_1366x768","201902/Punakaiki_1366x768","201902/BeatlesAshram_1366x768","201902/YNPFirefall_1366x768","201902/AlmondOrchard_1366x768","201902/StylusGroove_1366x768","201902/KomondorKennel_1366x768","201902/LoisachKochelsee_1366x768","201902/Misotsuchi_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/GBBC_1366x768","201902/AbstractSaltBeds_1366x768","201902/AbstractSaltBeds_1366x768","201902/lantern19_1366x768","201902/lantern19_1366x768","201902/RavenWolf_1366x768","201902/BathBach_1366x768","201902/BathBach_1366x768","201902/PlatteRiver_1366x768","201902/ChamonixWalkway_1366x768","201902/OldTownTallinn_1366x768","201902/OldTownTallinn_1366x768","201902/CumulusCaribbean_1366x768","201902/WinterGrand_1366x768","201902/PolarBearDay_1366x768","201902/HZMB_1366x768","201902/HZMB_1366x768","201902/MinnewankaBoathouse_1366x768","201902/HoaryMarmot_1366x768","201902/JapanCrane_1366x768","201902/newyeareve_1366x768","201902/springfestival_1366x768","201902/Punakaiki_1366x768","201902/BeatlesAshram_1366x768","201902/YNPFirefall_1366x768","201902/AlmondOrchard_1366x768","201902/StylusGroove_1366x768","201902/KomondorKennel_1366x768","201902/LoisachKochelsee_1366x768","201902/Misotsuchi_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/GBBC_1366x768","201902/AbstractSaltBeds_1366x768","201902/AbstractSaltBeds_1366x768","201902/lantern19_1366x768","201902/lantern19_1366x768","201902/RavenWolf_1366x768","201902/BathBach_1366x768","201902/BathBach_1366x768","201902/PlatteRiver_1366x768","201902/ChamonixWalkway_1366x768","201902/OldTownTallinn_1366x768","201902/OldTownTallinn_1366x768","201902/CumulusCaribbean_1366x768","201902/WinterGrand_1366x768","201902/PolarBearDay_1366x768","201902/HZMB_1366x768","201902/HZMB_1366x768","201901/LadyBugFrost_1366x768","201901/TeslaCoil_1366x768","201901/TeslaCoil_1366x768","201901/TeslaCoil_1366x768","201901/TeslaCoil_1366x768","201901/Newyear_1366x768","201901/TeslaCoil_1366x768","201901/LadyBugFrost_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/TwilightHarbin_1366x768","201901/SnowyOwlVideo_1366x768","201901/RainierDawn_1366x768","201901/VietnamStairs_1366x768","201901/SaguenayIceFishing_1366x768","201901/NapoleonsHat_1366x768","201901/Snowkiters_1366x768","201901/GoldenEagle_1366x768","201901/LaDigue_1366x768","201901/BM1759_1366x768","201901/AthabascaCave_1366x768","201901/UKSomerset_1366x768","201901/LatonaFountain_1366x768","201901/OceanDrive_1366x768","201901/DivingEmperors_1366x768","201901/GoldfinchSnow_1366x768","201901/BodegasYsios_1366x768","201901/ApfelTag_1366x768","201901/ParkCity_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/HolocaustMemorial_1366x768","201901/LKDobson_1366x768","201901/UpHellyAa_1366x768","201901/IcePalaceStPaul_1366x768","201901/WinterLynx_1366x768","201901/Newyear_1366x768","201901/TeslaCoil_1366x768","201901/LadyBugFrost_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/TwilightHarbin_1366x768","201901/SnowyOwlVideo_1366x768","201901/RainierDawn_1366x768","201901/VietnamStairs_1366x768","201901/SaguenayIceFishing_1366x768","201901/NapoleonsHat_1366x768","201901/Snowkiters_1366x768","201901/GoldenEagle_1366x768","201901/LaDigue_1366x768","201901/BM1759_1366x768","201901/AthabascaCave_1366x768","201901/UKSomerset_1366x768","201901/LatonaFountain_1366x768","201901/OceanDrive_1366x768","201901/DivingEmperors_1366x768","201901/GoldfinchSnow_1366x768","201901/BodegasYsios_1366x768","201901/ApfelTag_1366x768","201901/ParkCity_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/HolocaustMemorial_1366x768","201901/LKDobson_1366x768","201901/UpHellyAa_1366x768","201901/IcePalaceStPaul_1366x768","201901/WinterLynx_1366x768","201911/BisonYNP_1920x1080","201911/NMofAI_1920x1080","201911/NMofAI_1920x1080","201911/NMofAI_1920x1080","201911/BisonYNP_1920x1080","201911/AbseilersBigBen_1920x1080","201911/TollymoreForest_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/LouvreAutumn_1920x1080","201911/ChapelAiguilhe_1920x1080","201911/BerlinHeart_1920x1080","201911/SesameStreet50_1920x1080","201911/AuroraHealingFields_1920x1080","201911/BabyHedgehog_1920x1080","201911/BigWaveSurfing_1920x1080","201911/CrownofLight_1920x1080","201911/Murmurations_1920x1080","201911/Nebelmond_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/SimienGelada_1920x1080","201911/BeaujolaisRegion_1920x1080","201911/CuttySark150_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/AtchafalayaCypress_1920x1080","201911/OverwinteringMonarchs_1920x1080","201911/NMofAI_1920x1080","201911/BisonYNP_1920x1080","201911/AbseilersBigBen_1920x1080","201911/TollymoreForest_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/LouvreAutumn_1920x1080","201911/ChapelAiguilhe_1920x1080","201911/BerlinHeart_1920x1080","201911/SesameStreet50_1920x1080","201911/AuroraHealingFields_1920x1080","201911/BabyHedgehog_1920x1080","201911/BigWaveSurfing_1920x1080","201911/CrownofLight_1920x1080","201911/Murmurations_1920x1080","201911/Nebelmond_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/SimienGelada_1920x1080","201911/BeaujolaisRegion_1920x1080","201911/CuttySark150_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/AtchafalayaCypress_1920x1080","201911/OverwinteringMonarchs_1920x1080","201910/MercedWild_1920x1080","201910/CoffeeCherries_1920x1080","201910/CoffeeCherries_1920x1080","201910/MercedWild_1920x1080","201910/AdelieBreeding_1920x1080","201910/JupiterJunoCam_1920x1080","201910/TexasStarFerrisWheel_1920x1080","201910/MarlboroughSounds_1920x1080","201910/LouRuvo_1920x1080","201910/WorldOctopus_1920x1080","201910/GrandCanyonEast_1920x1080","201910/BubbleNebula_1920x1080","201910/RedRocksArches_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/AcadiaBlueberries_1920x1080","201910/AlbertaThanksgiving_1920x1080","201910/MaldivesDragonfly_1920x1080","201910/CompressionFossil_1920x1080","201910/LeavesGoldfish_1920x1080","201910/UncompahgreForest_1920x1080","201910/HalfMoonBayPumpkin_1920x1080","201910/PaleSloth_1920x1080","201910/Guggenheim60_1920x1080","201910/CrabAppleBlackbird_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/CountyBridge_1920x1080","201910/WorldLemurDay_1920x1080","201910/UnendingAttraction_1920x1080","201910/SaryuRiverDiyas_1920x1080","201910/FortRockHomestead_1920x1080","201910/EidolonHelvum_1920x1080","201910/CharlesNight_1920x1080","201910/VampireCastle_1920x1080","201910/CoffeeCherries_1920x1080","201910/MercedWild_1920x1080","201910/AdelieBreeding_1920x1080","201910/JupiterJunoCam_1920x1080","201910/TexasStarFerrisWheel_1920x1080","201910/MarlboroughSounds_1920x1080","201910/LouRuvo_1920x1080","201910/WorldOctopus_1920x1080","201910/GrandCanyonEast_1920x1080","201910/BubbleNebula_1920x1080","201910/RedRocksArches_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/AcadiaBlueberries_1920x1080","201910/AlbertaThanksgiving_1920x1080","201910/MaldivesDragonfly_1920x1080","201910/CompressionFossil_1920x1080","201910/LeavesGoldfish_1920x1080","201910/UncompahgreForest_1920x1080","201910/HalfMoonBayPumpkin_1920x1080","201910/PaleSloth_1920x1080","201910/Guggenheim60_1920x1080","201910/CrabAppleBlackbird_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/CountyBridge_1920x1080","201910/WorldLemurDay_1920x1080","201910/UnendingAttraction_1920x1080","201910/SaryuRiverDiyas_1920x1080","201910/FortRockHomestead_1920x1080","201910/EidolonHelvum_1920x1080","201910/CharlesNight_1920x1080","201910/VampireCastle_1920x1080","201909/Castelbouc_1920x1080","201909/DetroitIndustryMural_1920x1080","201909/GuaitaTower_1920x1080","201909/Vessel_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/ArroyoGrande_1920x1080","201909/TsavoGerenuk_1920x1080","201909/TowerofVoices_1920x1080","201909/MilkyWayCanyonlands_1920x1080","201909/DroneGlobe_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/TheVochol_1920x1080","201909/MushroomMonth_1920x1080","201909/LibertyDetail_1920x1080","201909/Villarrica_1920x1080","201909/CommonLoon_1920x1080","201909/ThePando_1920x1080","201909/WallofPeace_1920x1080","201909/LaMerceFireworks_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/KelpKeepers_1920x1080","201909/NankoweapGranaries_1920x1080","201909/HockingHills_1920x1080","201909/ClavijoLandscape_1920x1080","201909/DaxingPKX_1920x1080","201909/Castelbouc_1920x1080","201909/DetroitIndustryMural_1920x1080","201909/GuaitaTower_1920x1080","201909/Vessel_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/ArroyoGrande_1920x1080","201909/TsavoGerenuk_1920x1080","201909/TowerofVoices_1920x1080","201909/MilkyWayCanyonlands_1920x1080","201909/DroneGlobe_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/TheVochol_1920x1080","201909/MushroomMonth_1920x1080","201909/LibertyDetail_1920x1080","201909/Villarrica_1920x1080","201909/CommonLoon_1920x1080","201909/ThePando_1920x1080","201909/WallofPeace_1920x1080","201909/LaMerceFireworks_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/KelpKeepers_1920x1080","201909/NankoweapGranaries_1920x1080","201909/HockingHills_1920x1080","201909/ClavijoLandscape_1920x1080","201909/DaxingPKX_1920x1080","201908/LavaFlows_1920x1080","201908/WMAerial_1920x1080","201908/HumpbackSanctuary_1920x1080","201908/SwiftFox_1920x1080","201908/ApostleIslands_1920x1080","201908/WhiteStorksNest_1920x1080","201908/NubbleLight_1920x1080","201908/LinyantiLeopard_1920x1080","201908/GroveandSkywalk_1920x1080","201908/TrianaBridge_1920x1080","201908/TRNPThunderstorm_1920x1080","201908/AmboseliHerd_1920x1080","201908/MartianSouthPole_1920x1080","201908/HornedAnole_1920x1080","201908/SmogenSweden_1920x1080","201908/GoldRushYukon_1920x1080","201908/DrinkingNectar_1920x1080","201908/LecadaPalmeira_1920x1080","201908/ReplicaFlyer_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/FarmlandLandscape_1920x1080","201908/AugustBears_1920x1080","201908/BlackRockCity_1920x1080","201908/InteriorRoyalAlbertHall_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/AsburyParkNJ_1920x1080","201908/HardeeCoFair_1920x1080","201908/Slackers_1920x1080","201908/LavaFlows_1920x1080","201908/WMAerial_1920x1080","201908/HumpbackSanctuary_1920x1080","201908/SwiftFox_1920x1080","201908/ApostleIslands_1920x1080","201908/WhiteStorksNest_1920x1080","201908/NubbleLight_1920x1080","201908/LinyantiLeopard_1920x1080","201908/GroveandSkywalk_1920x1080","201908/TrianaBridge_1920x1080","201908/TRNPThunderstorm_1920x1080","201908/AmboseliHerd_1920x1080","201908/MartianSouthPole_1920x1080","201908/HornedAnole_1920x1080","201908/SmogenSweden_1920x1080","201908/GoldRushYukon_1920x1080","201908/DrinkingNectar_1920x1080","201908/LecadaPalmeira_1920x1080","201908/ReplicaFlyer_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/FarmlandLandscape_1920x1080","201908/AugustBears_1920x1080","201908/BlackRockCity_1920x1080","201908/InteriorRoyalAlbertHall_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/AsburyParkNJ_1920x1080","201908/HardeeCoFair_1920x1080","201908/Slackers_1920x1080","201907/CanadaDayCanoeing_1920x1080","201907/BailysBeads_1920x1080","201907/Transfagarasan_1920x1080","201907/SeattleFourth_1920x1080","201907/PeelCastle_1920x1080","201907/PelotonSunflowers_1920x1080","201907/WesternArcticHerd_1920x1080","201907/ChefchaouenMorocco_1920x1080","201907/JaguarPantanal_1920x1080","201907/KingsWalkway_1920x1080","201907/IndiaLitSpace_1920x1080","201907/NightofNights_1920x1080","201907/TheMac_1920x1080","201907/LeatherbackTT_1920x1080","201907/Ushitukiiwa_1920x1080","201907/HemingwayHome_1920x1080","201907/GobiSheep_1920x1080","201907/WaterperryGardens_1920x1080","201907/GodsGarden_1920x1080","201907/MoonMuseum_1920x1080","201907/BuckinghamSummer_1920x1080","201907/SardiniaHawkMoth_1920x1080","201907/Skywalk_1920x1080","201907/MeerkatMob_1920x1080","201907/JanesCarousel_1920x1080","201907/NendazAlpenhorn_1920x1080","201907/CahuitaNP_1920x1080","201907/NebraskaCarArt_1920x1080","201907/TrilliumLake_1920x1080","201907/TortoiseMigration_1920x1080","201907/TreeTower_1920x1080","201907/CanadaDayCanoeing_1920x1080","201907/BailysBeads_1920x1080","201907/Transfagarasan_1920x1080","201907/SeattleFourth_1920x1080","201907/PeelCastle_1920x1080","201907/PelotonSunflowers_1920x1080","201907/WesternArcticHerd_1920x1080","201907/ChefchaouenMorocco_1920x1080","201907/JaguarPantanal_1920x1080","201907/KingsWalkway_1920x1080","201907/IndiaLitSpace_1920x1080","201907/NightofNights_1920x1080","201907/TheMac_1920x1080","201907/LeatherbackTT_1920x1080","201907/Ushitukiiwa_1920x1080","201907/HemingwayHome_1920x1080","201907/GobiSheep_1920x1080","201907/WaterperryGardens_1920x1080","201907/GodsGarden_1920x1080","201907/MoonMuseum_1920x1080","201907/BuckinghamSummer_1920x1080","201907/SardiniaHawkMoth_1920x1080","201907/Skywalk_1920x1080","201907/MeerkatMob_1920x1080","201907/JanesCarousel_1920x1080","201907/NendazAlpenhorn_1920x1080","201907/CahuitaNP_1920x1080","201907/NebraskaCarArt_1920x1080","201907/TrilliumLake_1920x1080","201907/TortoiseMigration_1920x1080","201907/TreeTower_1920x1080","201906/BassRock_1920x1080","201906/HighTrestleTrail_1920x1080","201906/HighTrestleTrail_1920x1080","201906/BassRock_1920x1080","201906/HeligolandSealPup_1920x1080","201906/VastPalmGrove_1920x1080","201906/PeruvianRainforest_1920x1080","201906/MulberryArtificialHarbour_1920x1080","201906/DoughnutDay_1920x1080","201906/Biorocks_1920x1080","201906/CrownFountain_1920x1080","201906/PontadaPiedade_1920x1080","201906/CrackingArt_1920x1080","201906/RioGrande_1920x1080","201906/MachineElephant_1920x1080","201906/ChimneyRock_1920x1080","201906/ChalkArt_1920x1080","201906/PantheraLeoDad_1920x1080","201906/CrystalBridges_1920x1080","201906/HelixPomatia_1920x1080","201906/CherryLaurelMaze_1920x1080","201906/AlaskaEagle_1920x1080","201906/SunVoyager_1920x1080","201906/ManausBasin_1920x1080","201906/Gnomesville_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/Montreux_1920x1080","201906/BurrowingOwlet_1920x1080","201906/Pride2019_1920x1080","201906/HighTrestleTrail_1920x1080","201906/BassRock_1920x1080","201906/HeligolandSealPup_1920x1080","201906/VastPalmGrove_1920x1080","201906/PeruvianRainforest_1920x1080","201906/MulberryArtificialHarbour_1920x1080","201906/DoughnutDay_1920x1080","201906/Biorocks_1920x1080","201906/CrownFountain_1920x1080","201906/PontadaPiedade_1920x1080","201906/CrackingArt_1920x1080","201906/RioGrande_1920x1080","201906/MachineElephant_1920x1080","201906/ChimneyRock_1920x1080","201906/ChalkArt_1920x1080","201906/PantheraLeoDad_1920x1080","201906/CrystalBridges_1920x1080","201906/HelixPomatia_1920x1080","201906/CherryLaurelMaze_1920x1080","201906/AlaskaEagle_1920x1080","201906/SunVoyager_1920x1080","201906/ManausBasin_1920x1080","201906/Gnomesville_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/Montreux_1920x1080","201906/BurrowingOwlet_1920x1080","201906/Pride2019_1920x1080","201905/WisteriaTunnel_1920x1080","201905/RuffLek_1920x1080","201905/Waldplastik_1920x1080","201905/SkelligMichael_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/NCFireweed_1920x1080","201905/StMaryFalls_1920x1080","201905/CurlingBonspiel_1920x1080","201905/SerengetiZebra_1920x1080","201905/RailroadingTurntable_1920x1080","201905/ZaanseSchans_1920x1080","201905/PipingPlover_1920x1080","201905/PineLogSP_1920x1080","201905/BlueCannes_1920x1080","201905/NordkappSun_1920x1080","201905/AbuSimbel_1920x1080","201905/BicycleRelief_1920x1080","201905/COAAS_1920x1080","201905/Ghyakar_1920x1080","201905/ChannelIslandFox_1920x1080","201905/CRDelta_1920x1080","201905/ElProblema_1920x1080","201905/CuracaoTurtle_1920x1080","201905/MalvarrosaSandSculpture_1920x1080","201905/CapeMayWarbler_1920x1080","201905/MarathonduMont_1920x1080","201905/VVMWDC_1920x1080","201905/BeeWeek_1920x1080","201905/StravinskyFountain_1920x1080","201905/Manhattanhenge_1920x1080","201905/ZumwaltPrairie_1920x1080","201905/WisteriaTunnel_1920x1080","201905/RuffLek_1920x1080","201905/Waldplastik_1920x1080","201905/SkelligMichael_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/NCFireweed_1920x1080","201905/StMaryFalls_1920x1080","201905/CurlingBonspiel_1920x1080","201905/SerengetiZebra_1920x1080","201905/RailroadingTurntable_1920x1080","201905/ZaanseSchans_1920x1080","201905/PipingPlover_1920x1080","201905/PineLogSP_1920x1080","201905/BlueCannes_1920x1080","201905/NordkappSun_1920x1080","201905/AbuSimbel_1920x1080","201905/BicycleRelief_1920x1080","201905/COAAS_1920x1080","201905/Ghyakar_1920x1080","201905/ChannelIslandFox_1920x1080","201905/CRDelta_1920x1080","201905/ElProblema_1920x1080","201905/CuracaoTurtle_1920x1080","201905/MalvarrosaSandSculpture_1920x1080","201905/CapeMayWarbler_1920x1080","201905/MarathonduMont_1920x1080","201905/VVMWDC_1920x1080","201905/BeeWeek_1920x1080","201905/StravinskyFountain_1920x1080","201905/Manhattanhenge_1920x1080","201905/ZumwaltPrairie_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/HCABooks_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/HCA_1920x1080","201904/HCA_1920x1080","201904/BistiBadlands_1920x1080","201904/BistiBadlands_1920x1080","201904/NelderPlot_1920x1080","201904/YongfuTown_1920x1080","201904/Pepper_1920x1080","201904/GTNPBeaver_1920x1080","201904/SPLLobby_1920x1080","201904/BlueTide_1920x1080","201904/SibWrestling_1920x1080","201904/Bollenstreek_1920x1080","201904/BigWindDay_1920x1080","201904/RecordStoreDay_1920x1080","201904/GOTPath_1920x1080","201904/YayoiTulips_1920x1080","201904/BauhausArchive_1920x1080","201904/HopeValley_1920x1080","201904/MiracleGarden_1920x1080","201904/Paepalanthus_1920x1080","201904/CoveSpires_1920x1080","201904/HidingEggs_1920x1080","201904/LaysanAlbatross_1920x1080","201904/CasaBatllo_1920x1080","201904/RainforestMoss_1920x1080","201904/FireIce_1920x1080","201904/CoastalFog_1920x1080","201904/BloomingAloe_1920x1080","201904/SpringBadlands_1920x1080","201904/BabySloth_1920x1080","201904/LouisVienna_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/HCA_1920x1080","201904/HCA_1920x1080","201904/BistiBadlands_1920x1080","201904/BistiBadlands_1920x1080","201904/NelderPlot_1920x1080","201904/YongfuTown_1920x1080","201904/Pepper_1920x1080","201904/GTNPBeaver_1920x1080","201904/SPLLobby_1920x1080","201904/BlueTide_1920x1080","201904/SibWrestling_1920x1080","201904/Bollenstreek_1920x1080","201904/BigWindDay_1920x1080","201904/RecordStoreDay_1920x1080","201904/GOTPath_1920x1080","201904/YayoiTulips_1920x1080","201904/BauhausArchive_1920x1080","201904/HopeValley_1920x1080","201904/MiracleGarden_1920x1080","201904/Paepalanthus_1920x1080","201904/CoveSpires_1920x1080","201904/HidingEggs_1920x1080","201904/LaysanAlbatross_1920x1080","201904/CasaBatllo_1920x1080","201904/RainforestMoss_1920x1080","201904/FireIce_1920x1080","201904/CoastalFog_1920x1080","201904/BloomingAloe_1920x1080","201904/SpringBadlands_1920x1080","201904/BabySloth_1920x1080","201904/LouisVienna_1920x1080","201903/HZMB_1366x768","201903/PhillisWheatley_1366x768","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/ElephantMarch_1366x768","201903/MardiGrasIndians_1366x768","201903/Cefalu_1366x768","201903/BrittlebushBloom_1366x768","201903/Policewomen_1366x768","201903/Policewomen_1920x1080","201903/GrapeHarvest_1920x1080","201903/BagpipeOpera_1920x1080","201903/LeopardNamibia_1920x1080","201903/SpainRioTinto_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/RedandWhite_1920x1080","201903/TaoiseachDept_1920x1080","201903/TofinoCoast_1920x1080","201903/FallasBonfire_1920x1080","201903/EarlyBloomer_1920x1080","201903/BaobabGrove_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/AthensNight_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/AurovilleIndia_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201903/HZMB_1366x768","201903/PhillisWheatley_1366x768","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/ElephantMarch_1366x768","201903/MardiGrasIndians_1366x768","201903/Cefalu_1366x768","201903/BrittlebushBloom_1366x768","201903/Policewomen_1366x768","201903/Policewomen_1920x1080","201903/GrapeHarvest_1920x1080","201903/BagpipeOpera_1920x1080","201903/LeopardNamibia_1920x1080","201903/SpainRioTinto_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/RedandWhite_1920x1080","201903/TaoiseachDept_1920x1080","201903/TofinoCoast_1920x1080","201903/FallasBonfire_1920x1080","201903/EarlyBloomer_1920x1080","201903/BaobabGrove_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/AthensNight_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/AurovilleIndia_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201902/MigrationDance_1366x768","201902/HoaryMarmot_1366x768","201902/JapanCrane_1366x768","201902/RosaParks_1366x768","201902/LunarLanterns_1366x768","201902/Punakaiki_1366x768","201902/Misotsuchi_1366x768","201902/YNPFirefall_1366x768","201902/AlmondOrchard_1366x768","201902/StylusGroove_1366x768","201902/KomondorKennel_1366x768","201902/UFOMuseum_1366x768","201902/BeatlesAshram_1366x768","201902/BeatlesAshram_1366x768","201902/HeartCranes_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/GBBC_1366x768","201902/StitchedPrez_1366x768","201902/PingxiSky_1366x768","201902/RavenWolf_1366x768","201902/RavenWolf_1366x768","201902/BathBach_1366x768","201902/PlatteRiver_1366x768","201902/ChamonixWalkway_1366x768","201902/ChamonixWalkway_1366x768","201902/OldTownTallinn_1366x768","201902/CumulusCaribbean_1366x768","201902/CumulusCaribbean_1366x768","201902/WinterGrand_1366x768","201902/WinterGrand_1366x768","201902/PolarBearDay_1366x768","201902/HZMB_1366x768","201902/MigrationDance_1366x768","201902/HoaryMarmot_1366x768","201902/JapanCrane_1366x768","201902/RosaParks_1366x768","201902/LunarLanterns_1366x768","201902/Punakaiki_1366x768","201902/Misotsuchi_1366x768","201902/YNPFirefall_1366x768","201902/AlmondOrchard_1366x768","201902/StylusGroove_1366x768","201902/KomondorKennel_1366x768","201902/UFOMuseum_1366x768","201902/BeatlesAshram_1366x768","201902/BeatlesAshram_1366x768","201902/HeartCranes_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/GBBC_1366x768","201902/StitchedPrez_1366x768","201902/PingxiSky_1366x768","201902/RavenWolf_1366x768","201902/RavenWolf_1366x768","201902/BathBach_1366x768","201902/PlatteRiver_1366x768","201902/ChamonixWalkway_1366x768","201902/ChamonixWalkway_1366x768","201902/OldTownTallinn_1366x768","201902/CumulusCaribbean_1366x768","201902/CumulusCaribbean_1366x768","201902/WinterGrand_1366x768","201902/WinterGrand_1366x768","201902/PolarBearDay_1366x768","201902/HZMB_1366x768","201901/FujiSunrise_1366x768","201901/TeslaCoil_1366x768","201901/LadyBugFrost_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/TwilightHarbin_1366x768","201901/SnowyOwlVideo_1366x768","201901/RainierDawn_1366x768","201901/VietnamStairs_1366x768","201901/SaguenayIceFishing_1366x768","201901/NapoleonsHat_1366x768","201901/Snowkiters_1366x768","201901/GoldenEagle_1366x768","201901/LaDigue_1366x768","201901/BM1759_1366x768","201901/AthabascaCave_1366x768","201901/UKSomerset_1366x768","201901/LatonaFountain_1366x768","201901/OceanDrive_1366x768","201901/DivingEmperors_1366x768","201901/DrKingMonument_1366x768","201901/BodegasYsios_1366x768","201901/ApfelTag_1366x768","201901/ParkCity_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/HolocaustMemorial_1366x768","201901/LKDobson_1366x768","201901/UpHellyAa_1366x768","201901/IcePalaceStPaul_1366x768","201901/WinterLynx_1366x768","201901/FujiSunrise_1366x768","201901/TeslaCoil_1366x768","201901/LadyBugFrost_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/TwilightHarbin_1366x768","201901/SnowyOwlVideo_1366x768","201901/RainierDawn_1366x768","201901/VietnamStairs_1366x768","201901/SaguenayIceFishing_1366x768","201901/NapoleonsHat_1366x768","201901/Snowkiters_1366x768","201901/GoldenEagle_1366x768","201901/LaDigue_1366x768","201901/BM1759_1366x768","201901/AthabascaCave_1366x768","201901/UKSomerset_1366x768","201901/LatonaFountain_1366x768","201901/OceanDrive_1366x768","201901/DivingEmperors_1366x768","201901/DrKingMonument_1366x768","201901/BodegasYsios_1366x768","201901/ApfelTag_1366x768","201901/ParkCity_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/HolocaustMemorial_1366x768","201901/LKDobson_1366x768","201901/UpHellyAa_1366x768","201901/IcePalaceStPaul_1366x768","201901/WinterLynx_1366x768","201911/FoxMolt_1920x1080","201911/CorkTrees_1920x1080","201911/StylusGroove_1920x1080","201911/MtDiablo_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/TanukiDay_1920x1080","201911/KagamiMirror_1920x1080","201911/BerlinHeart_1920x1080","201911/ChapelAiguilhe_1920x1080","201911/MountHowitt_1920x1080","201911/BabyHedgehog_1920x1080","201911/Murmurations_1920x1080","201911/CrownofLight_1920x1080","201911/shiga753_1920x1080","201911/MeerkatMob_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/LouvreAutumn_1920x1080","201911/WineDay_1920x1080","201911/KochiFall_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/CuttySark150_1920x1080","201911/CountyBridge_1920x1080","201911/HairyHighlanders_1920x1080","201911/FoxMolt_1920x1080","201911/CorkTrees_1920x1080","201911/StylusGroove_1920x1080","201911/MtDiablo_1920x1080","201911/CamelsBalloons_1920x1080","201911/CrocusSativus_1920x1080","201911/TanukiDay_1920x1080","201911/KagamiMirror_1920x1080","201911/BerlinHeart_1920x1080","201911/ChapelAiguilhe_1920x1080","201911/MountHowitt_1920x1080","201911/BabyHedgehog_1920x1080","201911/Murmurations_1920x1080","201911/CrownofLight_1920x1080","201911/shiga753_1920x1080","201911/MeerkatMob_1920x1080","201911/VelvetRevolution_1920x1080","201911/IchetuckneeRiver_1920x1080","201911/ZionBirthday_1920x1080","201911/LouvreAutumn_1920x1080","201911/WineDay_1920x1080","201911/KochiFall_1920x1080","201911/QueenVictoriaAgave_1920x1080","201911/CuttySark150_1920x1080","201911/CountyBridge_1920x1080","201911/HairyHighlanders_1920x1080","201910/TrossachsAutumn_1920x1080","201910/CoffeeCherries_1920x1080","201910/CoffeeCherries_1920x1080","201910/CoffeeCherries_1920x1080","201910/TrossachsAutumn_1920x1080","201910/AdelieBreeding_1920x1080","201910/ChannelIslandFox_1920x1080","201910/JupiterJunoCam_1920x1080","201910/MarlboroughSounds_1920x1080","201910/LouRuvo_1920x1080","201910/Kanrofuji_1920x1080","201910/TinternAbbey_1920x1080","201910/LaysanAlbatross_1920x1080","201910/FICPlanets_1920x1080","201910/UhuRLP_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/KoumiLine_1920x1080","201910/AZDino_1920x1080","201910/SweetChestnut_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/KoonsPuppy_1920x1080","201910/AurovilleIndia_1920x1080","201910/PaleSloth_1920x1080","201910/GrandCanyonEast_1920x1080","201910/ChildrenPlaying_1920x1080","201910/LiquidNitrogen_1920x1080","201910/Narukokyo_1920x1080","201910/MiracleGarden_1920x1080","201910/WorldLemurDay_1920x1080","201910/RangoliDiwali_1920x1080","201910/Strahow_1920x1080","201910/FortRockHomestead_1920x1080","201910/AlbertaOwl_1920x1080","201910/PumpkinPatch_1920x1080","201910/CoffeeCherries_1920x1080","201910/TrossachsAutumn_1920x1080","201910/AdelieBreeding_1920x1080","201910/ChannelIslandFox_1920x1080","201910/JupiterJunoCam_1920x1080","201910/MarlboroughSounds_1920x1080","201910/LouRuvo_1920x1080","201910/Kanrofuji_1920x1080","201910/TinternAbbey_1920x1080","201910/LaysanAlbatross_1920x1080","201910/FICPlanets_1920x1080","201910/UhuRLP_1920x1080","201910/BarcolanaTrieste_1920x1080","201910/KoumiLine_1920x1080","201910/AZDino_1920x1080","201910/SweetChestnut_1920x1080","201910/ChurchillPolarBear_1920x1080","201910/KoonsPuppy_1920x1080","201910/AurovilleIndia_1920x1080","201910/PaleSloth_1920x1080","201910/GrandCanyonEast_1920x1080","201910/ChildrenPlaying_1920x1080","201910/LiquidNitrogen_1920x1080","201910/Narukokyo_1920x1080","201910/MiracleGarden_1920x1080","201910/WorldLemurDay_1920x1080","201910/RangoliDiwali_1920x1080","201910/Strahow_1920x1080","201910/FortRockHomestead_1920x1080","201910/AlbertaOwl_1920x1080","201910/PumpkinPatch_1920x1080","201909/TRNPThunderstorm_1920x1080","201909/LeopardNamibia_1920x1080","201909/GuaitaTower_1920x1080","201909/Vessel_1920x1080","201909/RamsauWimbachklamm_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/HakuroMaple_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/Castelbouc_1920x1080","201909/CoveSpires_1920x1080","201909/QinhuaiRiver_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/MonumentFountain_1920x1080","201909/Huuhkajat_1920x1080","201909/Wachsenburg_1920x1080","201909/Villarrica_1920x1080","201909/StokePero_1920x1080","201909/TsavoGerenuk_1920x1080","201909/WallofPeace_1920x1080","201909/LaMerceFireworks_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/ThePando_1920x1080","201909/BiwaB_1920x1080","201909/BloomingJacaranda_1920x1080","201909/ClavijoLandscape_1920x1080","201909/DaxingPKX_1920x1080","201909/TRNPThunderstorm_1920x1080","201909/LeopardNamibia_1920x1080","201909/GuaitaTower_1920x1080","201909/Vessel_1920x1080","201909/RamsauWimbachklamm_1920x1080","201909/Tegallalang_1920x1080","201909/ElMorro_1920x1080","201909/HakuroMaple_1920x1080","201909/MountFanjing_1920x1080","201909/SouthernYellow_1920x1080","201909/Castelbouc_1920x1080","201909/CoveSpires_1920x1080","201909/QinhuaiRiver_1920x1080","201909/ToothWalkingSeahorse_1920x1080","201909/MonumentFountain_1920x1080","201909/Huuhkajat_1920x1080","201909/Wachsenburg_1920x1080","201909/Villarrica_1920x1080","201909/StokePero_1920x1080","201909/TsavoGerenuk_1920x1080","201909/WallofPeace_1920x1080","201909/LaMerceFireworks_1920x1080","201909/FeatherSerpent_1920x1080","201909/UgandaGorilla_1920x1080","201909/LofotenSurfing_1920x1080","201909/ThePando_1920x1080","201909/BiwaB_1920x1080","201909/BloomingJacaranda_1920x1080","201909/ClavijoLandscape_1920x1080","201909/DaxingPKX_1920x1080","201908/RainforestMoss_1920x1080","201908/PittingGalesPoint_1920x1080","201908/Honeycomb_1920x1080","201908/BadlandsCycle_1920x1080","201908/MalvarrosaSandSculpture_1920x1080","201908/HiroOrigami_1920x1080","201908/COAAS_1920x1080","201908/WinterLynx_1920x1080","201908/GroveandSkywalk_1920x1080","201908/TrianaBridge_1920x1080","201908/KhumbuTents_1920x1080","201908/AmboseliHerd_1920x1080","201908/MarathonduMont_1920x1080","201908/HighTrestleTrail_1920x1080","201908/BassRock_1920x1080","201908/GoldRushYukon_1920x1080","201908/LecadaPalmeira_1920x1080","201908/Feringasee_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/AugustBears_1920x1080","201908/Glory_1920x1080","201908/MiyajimaFireworks_1920x1080","201908/FarmlandLandscape_1920x1080","201908/SwiftFox_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/HardeeCoFair_1920x1080","201908/AsburyParkNJ_1920x1080","201908/Slackers_1920x1080","201908/RainforestMoss_1920x1080","201908/PittingGalesPoint_1920x1080","201908/Honeycomb_1920x1080","201908/BadlandsCycle_1920x1080","201908/MalvarrosaSandSculpture_1920x1080","201908/HiroOrigami_1920x1080","201908/COAAS_1920x1080","201908/WinterLynx_1920x1080","201908/GroveandSkywalk_1920x1080","201908/TrianaBridge_1920x1080","201908/KhumbuTents_1920x1080","201908/AmboseliHerd_1920x1080","201908/MarathonduMont_1920x1080","201908/HighTrestleTrail_1920x1080","201908/BassRock_1920x1080","201908/GoldRushYukon_1920x1080","201908/LecadaPalmeira_1920x1080","201908/Feringasee_1920x1080","201908/FinlandCamping_1920x1080","201908/MaraRiverCrossing_1920x1080","201908/DubaiFountain_1920x1080","201908/AugustBears_1920x1080","201908/Glory_1920x1080","201908/MiyajimaFireworks_1920x1080","201908/FarmlandLandscape_1920x1080","201908/SwiftFox_1920x1080","201908/Krakatoa_1920x1080","201908/CorsiniGardens_1920x1080","201908/HardeeCoFair_1920x1080","201908/AsburyParkNJ_1920x1080","201908/Slackers_1920x1080","201907/CanadaDayCanoeing_1920x1080","201907/Montreux_1920x1080","201907/Transfagarasan_1920x1080","201907/SalcombeDevon_1920x1080","201907/SouthernRightFlukes_1920x1080","201907/BistiBadlands_1920x1080","201907/TanaOrigami_1920x1080","201907/HZMB_1920x1080","201907/SkylineparkRoller_1920x1080","201907/Hozuki_1920x1080","201907/IndiaLitSpace_1920x1080","201907/BagpipeOpera_1920x1080","201907/TheMac_1920x1080","201907/GTNPBeaver_1920x1080","201907/Ushitukiiwa_1920x1080","201907/ChilehausHH_1920x1080","201907/AthensNight_1920x1080","201907/EuropeanBarracuda_1920x1080","201907/GodsGarden_1920x1080","201907/MoonMuseum_1920x1080","201907/BuckinghamSummer_1920x1080","201907/FurinFes_1920x1080","201907/Skywalk_1920x1080","201907/CahuitaNP_1920x1080","201907/JanesCarousel_1920x1080","201907/NendazAlpenhorn_1920x1080","201907/SMfireworks_1920x1080","201907/PelotonSunflowers_1920x1080","201907/NebraskaCarArt_1920x1080","201907/TreeTower_1920x1080","201907/LavaFlows_1920x1080","201907/CanadaDayCanoeing_1920x1080","201907/Montreux_1920x1080","201907/Transfagarasan_1920x1080","201907/SalcombeDevon_1920x1080","201907/SouthernRightFlukes_1920x1080","201907/BistiBadlands_1920x1080","201907/TanaOrigami_1920x1080","201907/HZMB_1920x1080","201907/SkylineparkRoller_1920x1080","201907/Hozuki_1920x1080","201907/IndiaLitSpace_1920x1080","201907/BagpipeOpera_1920x1080","201907/TheMac_1920x1080","201907/GTNPBeaver_1920x1080","201907/Ushitukiiwa_1920x1080","201907/ChilehausHH_1920x1080","201907/AthensNight_1920x1080","201907/EuropeanBarracuda_1920x1080","201907/GodsGarden_1920x1080","201907/MoonMuseum_1920x1080","201907/BuckinghamSummer_1920x1080","201907/FurinFes_1920x1080","201907/Skywalk_1920x1080","201907/CahuitaNP_1920x1080","201907/JanesCarousel_1920x1080","201907/NendazAlpenhorn_1920x1080","201907/SMfireworks_1920x1080","201907/PelotonSunflowers_1920x1080","201907/NebraskaCarArt_1920x1080","201907/TreeTower_1920x1080","201907/LavaFlows_1920x1080","201906/PineLogSP_1920x1080","201906/OldTownTallinn_1920x1080","201906/HeligolandSealPup_1920x1080","201906/BlueTide_1920x1080","201906/CumulusCaribbean_1920x1080","201906/GordesLavender_1920x1080","201906/CrownFountain_1920x1080","201906/Biorocks_1920x1080","201906/FireFliesOkinawa_1920x1080","201906/OlomoucClock_1920x1080","201906/TreeFrog_1920x1080","201906/Punakaiki_1920x1080","201906/CapeMayWarbler_1920x1080","201906/RainierDawn_1920x1080","201906/ChalkArt_1920x1080","201906/PantheraLeoDad_1920x1080","201906/CrackingArt_1920x1080","201906/MachineElephant_1920x1080","201906/RioGrande_1920x1080","201906/SwissSuspension_1920x1080","201906/ChristmasIslandCrab_1920x1080","201906/SunVoyager_1920x1080","201906/AlanTuringNotebook_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/ManausBasin_1920x1080","201906/BeatlesAshram_1920x1080","201906/Chinowa2019_1920x1080","201906/PineLogSP_1920x1080","201906/OldTownTallinn_1920x1080","201906/HeligolandSealPup_1920x1080","201906/BlueTide_1920x1080","201906/CumulusCaribbean_1920x1080","201906/GordesLavender_1920x1080","201906/CrownFountain_1920x1080","201906/Biorocks_1920x1080","201906/FireFliesOkinawa_1920x1080","201906/OlomoucClock_1920x1080","201906/TreeFrog_1920x1080","201906/Punakaiki_1920x1080","201906/CapeMayWarbler_1920x1080","201906/RainierDawn_1920x1080","201906/ChalkArt_1920x1080","201906/PantheraLeoDad_1920x1080","201906/CrackingArt_1920x1080","201906/MachineElephant_1920x1080","201906/RioGrande_1920x1080","201906/SwissSuspension_1920x1080","201906/ChristmasIslandCrab_1920x1080","201906/SunVoyager_1920x1080","201906/AlanTuringNotebook_1920x1080","201906/PhilippinesFirefly_1920x1080","201906/SutherlandFalls_1920x1080","201906/GlastonburyTor_1920x1080","201906/RootBridge_1920x1080","201906/ManausBasin_1920x1080","201906/BeatlesAshram_1920x1080","201906/Chinowa2019_1920x1080","201905/NCFireweed_1920x1080","201905/CoastalFog_1920x1080","201905/DietBuilding_1920x1080","201905/MooseLakeGrass_1920x1080","201905/Koifish_1920x1080","201905/EtaAquarids_1920x1080","201905/BabySloth_1920x1080","201905/LightHouseNS_1920x1080","201905/SpringBadlands_1920x1080","201905/TDPflamingos_1920x1080","201905/CurlingBonspiel_1920x1080","201905/PipingPlover_1920x1080","201905/AbuSimbel_1920x1080","201905/BlueCannes_1920x1080","201905/NordkappSun_1920x1080","201905/Shipyard_1920x1080","201905/Ghyakar_1920x1080","201905/Kahaku_1920x1080","201905/ElProblema_1920x1080","201905/ParkRangerIsmael_1920x1080","201905/CRDelta_1920x1080","201905/BicycleRelief_1920x1080","201905/HawaiiGST_1920x1080","201905/PJ_1920x1080","201905/ZaanseSchans_1920x1080","201905/SerengetiZebra_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/SkelligMichael_1920x1080","201905/StMaryFalls_1920x1080","201905/OceanDrive_1920x1080","201905/UpHellyAa_1920x1080","201905/NCFireweed_1920x1080","201905/CoastalFog_1920x1080","201905/DietBuilding_1920x1080","201905/MooseLakeGrass_1920x1080","201905/Koifish_1920x1080","201905/EtaAquarids_1920x1080","201905/BabySloth_1920x1080","201905/LightHouseNS_1920x1080","201905/SpringBadlands_1920x1080","201905/TDPflamingos_1920x1080","201905/CurlingBonspiel_1920x1080","201905/PipingPlover_1920x1080","201905/AbuSimbel_1920x1080","201905/BlueCannes_1920x1080","201905/NordkappSun_1920x1080","201905/Shipyard_1920x1080","201905/Ghyakar_1920x1080","201905/Kahaku_1920x1080","201905/ElProblema_1920x1080","201905/ParkRangerIsmael_1920x1080","201905/CRDelta_1920x1080","201905/BicycleRelief_1920x1080","201905/HawaiiGST_1920x1080","201905/PJ_1920x1080","201905/ZaanseSchans_1920x1080","201905/SerengetiZebra_1920x1080","201905/AmericanCulturalCapital_1920x1080","201905/SkelligMichael_1920x1080","201905/StMaryFalls_1920x1080","201905/OceanDrive_1920x1080","201905/UpHellyAa_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/BathBach_1920x1080","201904/NapoleonsHat_1920x1080","201904/NapoleonsHat_1920x1080","201904/YongfuTown_1920x1080","201904/LaDigue_1920x1080","201904/PoniesWales_1920x1080","201904/FlowerFes_1920x1080","201904/TofinoCoast_1920x1080","201904/MuranoChristmas_1920x1080","201904/Bollenstreek_1920x1080","201904/FujiSakura_1920x1080","201904/RecordStoreDay_1920x1080","201904/TateyamaRoute_1920x1080","201904/GOTPath_1920x1080","201904/BauhausArchive_1920x1080","201904/ConcreteDinosaurs_1920x1080","201904/HopeValley_1920x1080","201904/Paepalanthus_1920x1080","201904/Mokuren_1920x1080","201904/HidingEggs_1920x1080","201904/ToroidalBubble_1920x1080","201904/CasaBatllo_1920x1080","201904/FireIce_1920x1080","201904/WalkingEmperor_1920x1080","201904/WisteriaTunnel_1920x1080","201904/ElephantMarch_1920x1080","201904/MinneapolisPride_1920x1080","201904/LovePark_1920x1080","201904/LouisVienna_1920x1080","201904/MischiefCubs_1920x1080","201904/HCABooks_1920x1080","201904/BathBach_1920x1080","201904/NapoleonsHat_1920x1080","201904/NapoleonsHat_1920x1080","201904/YongfuTown_1920x1080","201904/LaDigue_1920x1080","201904/PoniesWales_1920x1080","201904/FlowerFes_1920x1080","201904/TofinoCoast_1920x1080","201904/MuranoChristmas_1920x1080","201904/Bollenstreek_1920x1080","201904/FujiSakura_1920x1080","201904/RecordStoreDay_1920x1080","201904/TateyamaRoute_1920x1080","201904/GOTPath_1920x1080","201904/BauhausArchive_1920x1080","201904/ConcreteDinosaurs_1920x1080","201904/HopeValley_1920x1080","201904/Paepalanthus_1920x1080","201904/Mokuren_1920x1080","201904/HidingEggs_1920x1080","201904/ToroidalBubble_1920x1080","201904/CasaBatllo_1920x1080","201904/FireIce_1920x1080","201904/WalkingEmperor_1920x1080","201904/WisteriaTunnel_1920x1080","201904/ElephantMarch_1920x1080","201904/MinneapolisPride_1920x1080","201904/LovePark_1920x1080","201904/LouisVienna_1920x1080","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/hinafes_1366x768","201903/BrittlebushBloom_1366x768","201903/MardiGrasIndians_1366x768","201903/Fiddleheads_1366x768","201903/firefes_1366x768","201903/FearlessGirl_1366x768","201903/Cefalu_1366x768","201903/Cefalu_1920x1080","201903/CardonCactus_1920x1080","201903/Memorial311_1920x1080","201903/LKDobson_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/ChitalDawn_1920x1080","201903/TaoiseachDept_1920x1080","201903/SpiritBearSleeps_1920x1080","201903/FallasBonfire_1920x1080","201903/BaobabGrove_1920x1080","201903/EarlyBloomer_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/LightUpTokyo_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/SpainRioTinto_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201903/VinicuncaMountain_1366x768","201903/FinWhale_1366x768","201903/hinafes_1366x768","201903/BrittlebushBloom_1366x768","201903/MardiGrasIndians_1366x768","201903/Fiddleheads_1366x768","201903/firefes_1366x768","201903/FearlessGirl_1366x768","201903/Cefalu_1366x768","201903/Cefalu_1920x1080","201903/CardonCactus_1920x1080","201903/Memorial311_1920x1080","201903/LKDobson_1920x1080","201903/Uranus_1920x1080","201903/AgriculturalPi_1920x1080","201903/SeptimiusSeverus_1920x1080","201903/ChitalDawn_1920x1080","201903/TaoiseachDept_1920x1080","201903/SpiritBearSleeps_1920x1080","201903/FallasBonfire_1920x1080","201903/BaobabGrove_1920x1080","201903/EarlyBloomer_1920x1080","201903/TashkurganGrasslands_1920x1080","201903/HolePunchClouds_1920x1080","201903/PWSRecovery_1920x1080","201903/LightUpTokyo_1920x1080","201903/SakuraFes_1920x1080","201903/SapBuckets_1920x1080","201903/RufousTailed_1920x1080","201903/SpainRioTinto_1920x1080","201903/EarthHourNYC_1920x1080","201903/EiffelBelow_1920x1080","201902/Misotsuchi_1366x768","201902/HoaryMarmot_1366x768","201902/SetsubunBeans_1366x768","201902/RisshunBirds2_1366x768","201902/DragonDance_1366x768","201902/GustavKlimt_1366x768","201902/CardinalBerries_1366x768","201902/YNPFirefall_1366x768","201902/FairSeason_1366x768","201902/GodrevyLighthouse_1366x768","201902/YosemiteBridge_1366x768","201902/DarwinOrigin_1366x768","201902/NorsteadLights_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/AbstractSaltBeds_1366x768","201902/PingxiSky_1366x768","201902/TwilightHarbin_1366x768","201902/LaGrandeNomade_1366x768","201902/MountainCougar_1366x768","201902/RavenWolf_1366x768","201902/HomerWatercolor_1366x768","201902/UmeMatsuri_1366x768","201902/WinterGrand_1366x768","201902/ChurchillPB_1366x768","201902/ChamonixWalkway_1366x768","201902/Misotsuchi_1366x768","201902/HoaryMarmot_1366x768","201902/SetsubunBeans_1366x768","201902/RisshunBirds2_1366x768","201902/DragonDance_1366x768","201902/GustavKlimt_1366x768","201902/CardinalBerries_1366x768","201902/YNPFirefall_1366x768","201902/FairSeason_1366x768","201902/GodrevyLighthouse_1366x768","201902/YosemiteBridge_1366x768","201902/DarwinOrigin_1366x768","201902/NorsteadLights_1366x768","201902/HeartCranes_1366x768","201902/Kamakura_1366x768","201902/PangolinDay_1366x768","201902/GBBC_1366x768","201902/AbstractSaltBeds_1366x768","201902/PingxiSky_1366x768","201902/TwilightHarbin_1366x768","201902/LaGrandeNomade_1366x768","201902/MountainCougar_1366x768","201902/RavenWolf_1366x768","201902/HomerWatercolor_1366x768","201902/UmeMatsuri_1366x768","201902/WinterGrand_1366x768","201902/ChurchillPB_1366x768","201902/ChamonixWalkway_1366x768","201901/NewYearDeco_1366x768","201901/FujiSunrise_1366x768","201901/FujiSunrise_1366x768","201901/FujiSunrise_1366x768","201901/NewYearDeco_1366x768","201901/NewYearBoar_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/ManateeAwareness_1366x768","201901/TeslaCoil_1366x768","201901/SnowyOwlVideo_1366x768","201901/KilimanjaroMawenzi_1366x768","201901/BanffEvergreens_1366x768","201901/JohnDaySnow_1366x768","201901/LadyBugFrost_1366x768","201901/ColdMoonRising_1366x768","201901/Furisode_1366x768","201901/BM1759_1366x768","201901/OsoyoosExpressway_1366x768","201901/PragueChristmas_1366x768","201901/NLNorway_1366x768","201901/KilchurnSky_1366x768","201901/BrockenbahnHarz_1366x768","201901/Nuuk_1366x768","201901/SphinxObservatory_1366x768","201901/LascauxCavePainting_1366x768","201901/VarennaSnow_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/BadlandsBday_1366x768","201901/AliceCentralPark_1366x768","201901/ChateauGaillard_1366x768","201901/RedAntarctica_1366x768","201901/WindmillLighthouse_1366x768","201901/FujiSunrise_1366x768","201901/NewYearDeco_1366x768","201901/NewYearBoar_1366x768","201901/LandshutReliefMap_1366x768","201901/ParisOpera_1366x768","201901/ManateeAwareness_1366x768","201901/TeslaCoil_1366x768","201901/SnowyOwlVideo_1366x768","201901/KilimanjaroMawenzi_1366x768","201901/BanffEvergreens_1366x768","201901/JohnDaySnow_1366x768","201901/LadyBugFrost_1366x768","201901/ColdMoonRising_1366x768","201901/Furisode_1366x768","201901/BM1759_1366x768","201901/OsoyoosExpressway_1366x768","201901/PragueChristmas_1366x768","201901/NLNorway_1366x768","201901/KilchurnSky_1366x768","201901/BrockenbahnHarz_1366x768","201901/Nuuk_1366x768","201901/SphinxObservatory_1366x768","201901/LascauxCavePainting_1366x768","201901/VarennaSnow_1366x768","201901/KukeriCostume_1366x768","201901/FortRajgad_1366x768","201901/BadlandsBday_1366x768","201901/AliceCentralPark_1366x768","201901/ChateauGaillard_1366x768","201901/RedAntarctica_1366x768","201901/WindmillLighthouse_1366x768"];

        try {
            var dtd    = $.Deferred(),
                max    = bing_ids.length - 1,
                id     = bing_ids[ apis.Random( 0, max ) ],
                url    = "https://bing.nanxiongnandi.com/" + id + ".jpg";
            apis.Update({ url : url, method: "apis.randomBing()", timeout: 2000 * 3 });
            dtd.resolve( url, url, "Bing.com Image", "#", date.Now(), "Bing.com Image", apis.vo.origin, apis.vo );
        }
        catch ( error ) {
            dtd.reject( new SimpError( apis.vo.method, "Parse bing.com image error.", apis.vo ), error );
        }
      return dtd;
    }

    /*
    * Wall Haven
    */
    apis.Stack[ apis.ORIGINS[0] ] = function() {

      console.log( "=== Wallhaven.cc call ===" );

      // wallhaven background ids
      var wallhaven_ids = [64346, 103929, 12852, 115399, 26623, 101496, 5527, 118585, 102569, 116915, 118993, 6352, 6873, 53356, 10017, 2042, 69737, 113377, 11706, 5168, 16270, 51579, 72375, 156241, 9832, 56481, 6693, 34887, 159465, 6413, 2986, 43537, 6361, 440, 396, 4389, 1784, 6072, 1769, 10694, 3507, 3335, 57239, 1148, 65146, 1045, 852, 7338, 154446, 102924, 354, 7115, 22629, 937, 1212, 26797, 4929, 6463, 26326, 1438, 64115, 395, 800, 1346, 6759, 799, 153883, 1942, 13072, 74098, 3866, 6448, 2987, 4914, 1874, 10568, 152693, 33560, 5269, 8463, 15403, 1926, 92, 124411, 2481, 12421, 110001, 51777, 18395, 4723, 7599, 809, 44628, 914, 819, 157024, 60284, 61, 2018, 5087, 6797, 9424, 391, 9349, 138624, 21821, 2540, 102549, 3065, 561, 1123, 4027, 4764, 22721, 4026, 725, 98217, 909, 28975, 1038, 22301, 7837, 6689, 33390, 1027, 7730, 1194, 367, 73294, 6990, 15899, 31275, 4126, 18392, 13468, 6465, 6416, 21068, 4869, 10524, 1107, 7686, 102435, 6066, 18337, 26481, 397, 33660, 6881, 2651, 1116, 6692, 51501, 60122, 4129, 11824, 19052, 11779, 3236, 4063, 5206, 15859, 29165, 100584, 7883, 5368, 12001, 13554, 2112, 1177, 14091, 50083, 102428, 67027, 70532, 598, 107498, 9680, 1190, 16426, 14, 32935, 21041, 143053, 4653, 6457, 6469, 14598, 22926, 5734, 1896, 12822, 52603, 12690, 7113, 12754, 17773, 110824, 16086, 8079, 73291, 164830, 5603, 11521, 33002, 18321, 118264, 141343, 3345, 5276, 30215, 56165, 6360, 26607, 24911, 31175, 93783, 7162, 849, 13973, 22998, 2897, 9906, 16687, 18709, 2197, 727, 56825, 13117, 105033, 151619, 5648, 21124, 390, 1180, 12781, 103248, 12821, 22469, 76442, 3020, 157, 13623, 81327, 2648, 17708, 99124, 28128, 10459, 2574, 3332, 19882, 2099, 19092, 106937, 146159, 14612, 536, 7843, 12427, 6876, 9035, 14190, 16970, 40859, 52526, 8196, 812, 99496, 3344, 4657, 13997, 24362, 108103, 851, 7505, 51126, 4862, 845, 10774, 5696, 13003, 27415, 45880, 149047, 12687, 102502, 28800, 6695, 8088, 13713, 4430, 107471, 8110, 33557, 1014, 7961, 13120, 18935, 31355, 10823, 4153, 6678, 6173, 7900, 13551, 82544, 16149, 2090, 13463, 15192, 30760, 5974, 51583, 69694, 154038, 165768, 13748, 28343, 32786, 60597, 19133, 9012, 16611, 101980, 560, 8440, 15708, 10695, 104618, 131692, 4804, 31274, 33408, 34761, 910, 2145, 13094, 53325, 59867, 107019, 159224, 8987, 11806, 1152, 3153, 38641, 102539, 13112, 126849, 3104, 13118, 29381, 51581, 40786, 154036, 232, 4901, 6875, 5536, 9709, 148270, 13739, 810, 2088, 11866, 9589, 10748, 22414, 34969, 67030, 2184, 4871, 4922, 7945, 22415, 28348, 31055, 38760, 56755, 65472, 99642, 157564, 20212, 7674, 29854, 16046, 148437, 56179, 29051, 7679, 2182, 29158, 26394, 52654, 43850, 28000, 28182, 32715, 32998, 4925, 5598, 12779, 16170, 52681, 115635, 105059, 34091, 55984, 73804, 70730, 76911, 141991, 156705, 21074, 6454, 21121, 45227, 102545, 17687, 69347, 47212, 25439, 3002, 70732, 154047, 142573, 93556, 3983, 5782, 9443, 24754, 25524, 19546, 21065, 88046, 115381, 139800, 155438, 119054, 140504, 106741, 34317, 509, 6351, 9437, 54764, 54416, 107497, 101507, 140670, 153983, 154633, 152771, 1185, 4944, 803, 808, 6706, 10825, 24686, 22306, 56482, 74395, 86566, 45389, 56792, 77363, 102498, 102537, 64132, 101426, 167125, 41060, 3513, 8599, 5742, 22302, 140, 19119, 28886, 29187, 35507, 36219, 50079, 63882, 72693, 76070, 133209, 153923, 81656, 52514, 6359, 6688, 28438, 1121, 72461, 92983, 9769, 1437, 3053, 5744, 12862, 11838, 28340, 33779, 72734, 132176, 20260, 34603, 1178, 4881, 4968, 3047, 9711, 9824, 10280, 18342, 56417, 68328, 87809, 118569, 131631, 30752, 93452, 156437, 138315, 159296, 353, 959, 3365, 12826, 13122, 6922, 9034, 4654, 5195, 10755, 19536, 43910, 92967, 154172, 10882, 2312, 6738, 8683, 3025, 13589, 13882, 14551, 11778, 16499, 10941, 11103, 26501, 45289, 53321, 68351, 101357, 5379, 8234, 57645, 79271, 51585, 468, 70371, 72182, 141518, 41151, 113423, 43075, 907, 919, 1305, 2000, 9708, 28643, 18315, 57798, 30927, 10758, 41289, 66434, 103247, 114383, 153848, 152410, 145410, 165672, 24421, 34273, 8580, 8073, 12755, 12870, 14054, 16238, 65470, 62851, 115616, 126567, 142633, 159412, 152536, 77583, 559, 101792, 3353, 14574, 18386, 32297, 6528, 9919, 10394, 35967, 94848, 102638, 120488, 139927, 137729, 73551, 166014, 33029, 4523, 9681, 9910, 21296, 21847, 20231, 2089, 2798, 12889, 13604, 11653, 18368, 25522, 28204, 33392, 102533, 128635, 159414, 152792, 143664, 24822, 10009, 40963, 60125, 13566, 26653, 31289, 27310, 27757, 32960, 1998, 569, 5072, 15194, 68340, 66762, 123787, 102541, 32744, 132151, 58663, 6867, 1944, 2322, 12848, 16597, 10481, 28794, 18365, 27013, 62470, 56478, 32808, 33154, 71642, 83685, 105813, 164744, 129914, 11206, 114989, 18601, 132284, 1937, 56480, 31172, 30201, 34968, 43349, 821, 883, 2448, 2936, 3371, 11803, 7405, 13138, 19270, 16043, 16187, 64345, 106949, 98577, 144247, 77653, 31166, 157694, 60209, 13758, 815, 2052, 2095, 13557, 13603, 16169, 7812, 6674, 8442, 8909, 9786, 35258, 35347, 33358, 51076, 72907, 68331, 71656, 70994, 90625, 62294, 60926, 99002, 92917, 101680, 140044, 164950, 165674, 148916, 10914, 137402, 4720, 21335, 1997, 13565, 11862, 12000, 15636, 15706, 31764, 29341, 33405, 36644, 40962, 44868, 52518, 50980, 49116, 66747, 69621, 72600, 84958, 80519, 107451, 124145, 157848, 154003, 152665, 73379, 33556, 43311, 45278, 56511, 49922, 58682, 65132, 6525, 8444, 10980, 11515, 26177, 25181, 29102, 4877, 15860, 22295, 78508, 76913, 75509, 106149, 107729, 157279, 154251, 5363, 10752, 51908, 546, 1641, 1918, 3027, 3868, 5085, 5799, 12855, 13579, 13745, 15169, 14159, 10392, 10397, 26200, 34753, 33370, 51447, 74172, 74401, 10587, 19628, 41157, 42713, 43843, 68377, 98158, 133270, 149051, 144582, 164523, 62569, 20233, 12778, 25520, 22805, 20289, 31779, 32789, 35252, 38011, 45890, 48616, 47199, 1205, 1743, 2001, 5086, 2796, 3028, 3155, 11808, 9704, 13556, 14307, 15261, 18328, 16738, 16055, 56145, 56486, 73226, 70746, 70373, 81325, 107447, 101494, 114911, 117218, 153801, 158971, 155972, 77728, 840, 59985, 31849, 19554, 283, 916, 1939, 1946, 3346, 14219, 19207, 16594, 31206, 27262, 5962, 12232, 5169, 34813, 36511, 33548, 34180, 54727, 51906, 74737, 72591, 75115, 43004, 58368, 80171, 98991, 101022, 140638, 132180, 156161, 156250, 153547, 52447, 7510, 3405, 10427, 6207, 22782, 22460, 2060, 1005, 12841, 12923, 13591, 10693, 26392, 27294, 24644, 28925, 35521, 33563, 40366, 56469, 63762, 59449, 90049, 101561, 114920, 142394, 72701, 69619, 52525, 70736, 58364, 11223, 1207, 43602, 51578, 60954, 7193, 12842, 13737, 8451, 9372, 10480, 29018, 29203, 29392, 975, 3247, 4411, 16091, 24018, 19502, 37441, 37612, 65238, 68333, 85825, 107515, 103227, 133250, 133527, 137726, 147489, 149050, 158772, 153986, 154035, 155970, 157654, 41529, 20179, 22411, 6468, 2012, 2315, 3318, 3356, 3534, 5155, 7430, 13923, 18310, 18346, 59989, 36254, 31348, 52673, 54092, 68372, 71041, 87517, 111740, 154303, 147048, 117921, 19535, 19821, 31185, 40939, 33415, 34038, 38225, 42447, 45352, 2013, 2284, 6755, 12008, 7448, 13520, 13811, 13842, 18455, 19129, 16601, 54694, 51431, 51582, 51671, 64371, 68443, 73947, 69561, 79786, 85930, 86053, 86250, 93558, 86419, 107500, 101146, 115370, 118994, 127298, 141003, 141508, 139041, 142602, 144026, 159284, 158034, 101019, 106918, 104657, 169618, 149216, 82436, 30884, 144920, 93, 1996, 3315, 12751, 12833, 15159, 15534, 19252, 16746, 32305, 29061, 9027, 11760, 12294, 12314, 25730, 26194, 26593, 22313, 35018, 55511, 51588, 53349, 54400, 49196, 72197, 88606, 44127, 47210, 65077, 78304, 98838, 107450, 104639, 105005, 140486, 154723, 158035, 80063, 8480, 161778, 67028, 113421, 117308, 59025, 5847, 4509, 4864, 4876, 3049, 3063, 811, 13084, 13731, 12271, 26188, 26633, 27218, 28502, 31168, 31682, 34489, 44596, 54735, 58597, 59665, 90099, 88587, 81839, 75793, 101287, 106686, 111628, 114564, 132179, 140564, 164951, 157709, 159293, 148777, 132174, 106112, 30886, 54700, 52196, 53733, 54363, 63756, 57716, 57785, 62885, 5654, 8588, 8886, 12361, 27295, 32977, 266, 4752, 16089, 18662, 22719, 35705, 36816, 34137, 34308, 34891, 68352, 87681, 87895, 88468, 83381, 85178, 107875, 101500, 115121, 120358, 141695, 139138, 138868, 138969, 149810, 154174, 164469, 26329, 2509, 143658, 78971, 30801, 363, 6451, 4912, 5357, 9126, 12797, 12999, 15652, 11686, 28009, 18322, 18663, 25219, 60013, 60741, 36329, 51365, 51428, 52596, 74386, 74519, 41006, 72450, 87137, 85953, 85078, 93355, 98470, 107453, 141773, 164679, 154043, 154125, 2461, 15164, 106234, 69844, 34309, 88837, 109308, 160730, 35876, 64654, 137025, 10448, 53683, 137330, 43627, 46695, 98634, 49454, 54275, 46621, 40635, 134557, 56896, 79456, 103141, 72602, 42314, 31355, 44877, 169035, 146158, 7567, 4126, 62487, 55747, 145376, 45870, 145434, 32029, 53359, 113188, 33452, 42446, 6660, 22366, 73035, 65094, 113323, 58400, 108968, 74850, 72880, 150661, 58020, 95750, 116733, 93502, 66422, 45882, 71318, 140643, 79456, 145922, 18670, 44339, 56858, 19894, 37043, 153141, 137133, 69279, 25375, 3289, 58164, 4715, 145282, 139874, 123729, 134055, 94168, 53802, 53703, 137319, 65361, 59901, 38750, 8587, 85843, 35124, 811, 45983, 96082, 124145, 51452, 148471, 160353, 25339, 162222, 43175, 99301, 8616, 51240, 108219, 117128, 62062, 162241, 139517, 113102, 40607, 52619, 46249, 147433, 147860, 6862, 8436, 9434, 136607, 140064, 36480, 58640, 24829, 115858, 86571, 147432, 71034, 131363, 130310, 15376, 21909, 76361, 65429, 107833, 54854, 117556, 60939, 9522, 103531, 92160, 44144, 3005, 161184, 161792, 98415, 865, 66210, 42683, 101366, 38429, 101725, 45096, 29095, 93, 36079, 23831, 79597, 137414, 47568, 135692, 124361, 140845, 164809, 46270, 59573, 167125, 69878, 45298, 163984, 120298, 60895, 104527, 44868, 109375, 138927, 48535, 163698, 157881, 142579, 98603, 33372, 95582, 27678, 30888, 45152, 147788, 42696, 19628, 132488, 116478, 24573, 151419, 165874, 59530, 9015, 38741, 3227, 152491, 134564, 162269, 52250, 52260, 44555, 95748, 81663, 72582, 97040, 8116, 44994, 120820, 34650, 53271, 56992, 41909, 84530, 134461, 135497, 2649, 11009, 101477, 59254, 99778, 84042, 47410, 103203, 100308, 116881, 53173, 47429, 43848, 160730, 73128, 93804, 137554, 33654, 90940, 149638, 73758, 164812, 56478, 168629, 45957, 129646, 137151, 138623, 155106, 150986, 48975, 8474, 45634, 38120, 45168, 45863, 17264, 116705, 168459, 59193, 60515, 110460, 123774, 164566, 133842, 98996, 152798, 120339, 124145, 162486, 56783, 35857, 139138, 52002, 127986, 107028, 99731, 46234, 164824, 10181, 65651, 54420, 47075, 14, 89585, 138225, 149335, 145943, 51165, 62125, 122568, 138558, 84815, 159562, 81646, 134425, 112512, 28921, 18863, 76670, 169015, 62963, 136328, 148762, 116637, 128829, 13926, 131759, 46394, 54426, 152927, 47110, 136591, 162638, 46066, 128005, 56844, 73188, 72796, 104345, 47553, 46128, 135779, 137190, 60299, 22953, 51989, 17265, 44535, 61135, 76133, 144828, 52017, 31466, 112336, 75216, 120316, 106465, 121018, 35330, 73122, 126988, 114324, 74792, 25232, 45014, 125647, 133932, 116978, 70093, 46111, 11863, 101938, 137532, 84846, 153742, 26068, 107977, 110086, 139075, 98601, 60190, 57254, 2912, 137331, 43026, 110463, 88215, 59307, 21918, 116583, 78991, 46261, 44723, 44923, 83550, 51070, 118598, 47711, 8452, 34876, 80993, 142673, 88864, 18934, 98391, 46124, 108004, 59014, 122508, 41654, 52196, 32825, 82740, 13998, 61806, 133045, 11222, 41319, 32626, 27696, 62304, 157848, 52990, 111656, 34430, 49203, 116475, 40635, 85129, 137497, 36496, 126309, 120329, 42796, 59257, 46359, 90159, 54758, 129507, 106025, 135690, 142702, 110206, 5370, 41961, 114050, 58029, 79276, 30346, 10149, 63815, 44214, 8055, 106036, 43903, 48904, 4756, 79101, 163872, 3053, 31811, 47732, 41383, 75727, 40700, 1438, 55855, 163368, 120947, 107881, 90229, 138071, 138635, 92972, 145888, 32569, 52102, 77445, 27466, 49384, 112962, 135301, 56898, 22609, 58529, 79043, 43283, 41121, 25357, 131673, 73701, 36255, 10545, 72700, 9014, 61650, 95745, 27126, 44463, 146896, 161163, 106257, 26336, 148696, 141682, 34176, 137616, 4725, 54310, 121399, 127885, 100509, 48451, 55779, 72375, 164102, 110160, 44514, 134692, 47407, 47573, 88595, 124200, 52531, 20177, 82649, 18133, 127754, 59602, 53268, 170541, 61660, 75572, 62394, 14751, 17765, 40317, 53820, 123414, 146033, 48090, 112378, 109750, 108803, 107154, 115637, 64046, 145894, 164733, 145068, 37550, 94620, 47707, 72588, 138627, 10709, 47677, 167173, 161988, 52054, 112932, 54096, 24019, 135141, 17794, 49809, 77183, 19885, 57899, 75115, 54053, 121092, 146916, 66401, 48429, 2931, 44968, 165685, 43307, 41028, 11161, 40275, 1003, 104059, 10413, 83771, 86992, 83781, 48389, 32548, 67038, 137005, 29847, 124417, 54768, 135245];
      try {
        var dtd    = $.Deferred(),
            max    = wallhaven_ids.length - 1,
            id     = wallhaven_ids[ apis.Random( 0, max ) ],
            url    = "http://alpha.wallhaven.cc/wallpapers/full/wallhaven-" + id + ".jpg";
        apis.Update({ url : url, method: "apis.wallhaven()", dataType : "image" });
        dtd.resolve( url, url, "Wallhaven.cc Image", "#", date.Now(), "Wallhaven.cc Image", apis.vo.origin, apis.vo );
      }
      catch ( error ) {
        dtd.reject( new SimpError( apis.vo.origin, "Parse wallhaven error, url is " + url, apis.vo ), error );
      }
      return dtd;
    }

    /*
    * Unsplash.COM
    */
    apis.Stack[ apis.ORIGINS[1] ] = function() {

        console.log( "=== Unsplash.com call ===" );

        var unsplash_ids = options.Storage.db.unsplash,
            screen       = /\d+x\d+/.test( options.Storage.db.unsplash_screen ) ? options.Storage.db.unsplash_screen : "2560x1440";
        try {
            var dtd    = $.Deferred(),
                max    = unsplash_ids.length,
                id     = unsplash_ids[ apis.Random( 0, max - 1 ) ],
                url    = "https://source.unsplash.com/" + id;
            max == 0 && ( url = "https://source.unsplash.com/random" );
            !/\/\d+x\d+$/.test( url ) && ( url += "/" + screen );
            apis.Update({ url : url, method: "apis.unsplashCOM()", dataType : "image" });
            dtd.resolve( url, url, "Unsplash.com Image", "#", date.Now(), "Unsplash.com Image", apis.vo.origin, apis.vo );
        }
        catch ( error ) {
            dtd.reject( new SimpError( apis.vo.method , "Parse unsplash.com error, url is " + url, apis.vo ), error );
        }
        return dtd;
}

    /*
    * Unsplash.IT
    */
    apis.Stack[ apis.ORIGINS[2] ] = function() {

        console.log( "=== Unsplash.it call ===" );

        try {
          var dtd = $.Deferred(),
              url = "https://picsum.photos/1920/1080/?random"
          apis.Update({ url : url, method: "apis.unsplashIT()", dataType : "image" });
          dtd.resolve( url, url, "Unsplash.it Image", "#", date.Now(), "Unsplash.it Image", apis.vo.origin, apis.vo );
        }
        catch( error ) {
            dtd.reject( new SimpError( apis.vo.origin , "Parse unsplash.it error, url is " + url, apis.vo ), error );
        }
        return dtd;
    }

    /*
    * Flickr.com
    * e.g. https://api.flickr.com/services/rest/?method=[method name]&api_key=[api key]&[key]=[value]&format=json
    */
    var FLICKR_NAME       = "flickr.api.json",
        FLICKR_API_KEY    = "5feac8799f0102a4c93542f7cc82f5e1",
        FLICKR_HOST       = "https://api.flickr.com/services/rest/",
        FLICKR_PHOTO_API  = "flickr.photos.getSizes";

    function getFlickAPI( method, key, value ) {
        return FLICKR_HOST + "?method=" + method + "&api_key=" + FLICKR_API_KEY + "&" + key + "=" + value + "&format=json&jsoncallback=?";
    }

    apis.Stack[ apis.ORIGINS[3] ]  = function() {

        console.log( "=== Flickr.com call ===");

        apis.Update({ url : SIMP_API_HOST + FLICKR_NAME, method : "apis.flickr()" });
        apis.Remote( function( result ) {
            getFlickrURL( result ).then( getFlickrPhotos ).then( getFlickrPhotoURL );
        });
        return apis.defer.promise();
    }

    function getFlickrURL( result ) {

        console.log( "=== Flickr.com::getFlickrURL() call ===");

        var def = $.Deferred();
        try {
            var max    = result.apis.length - 1,
                random = apis.Random( 0, max ),
                api    = result.apis[ random ],
                method = api.method,
                key    = api.keys["key"],
                values = api.keys["val"];
            random     = apis.Random( 0, values.length - 1 );
            def.resolve( getFlickAPI( method, key, values[random] ));
        }
        catch ( error ) {
            apis.defer.reject( new SimpError( "apis.getFlickrURL()" , "Parse flickr.com error, url is " + apis.vo.url, apis.vo ), error );
        }
        return def.promise();
    }

    function getFlickrPhotos( url ) {

        console.log( "=== Flickr.com::getFlickrPhotos() call ===");

        var def = $.Deferred();
        apis.Update({ url : url, method : "apis.flickr()::getFlickrPhotos()", timeout: 2000 * 5 });
        apis.Remote( function( result ) {
            try {
                var len    = result.photos.photo.length,
                    random = apis.Random( 0, len - 1 ),
                    photo  = result.photos.photo[ random ];
                def.resolve( photo.id );
            }
            catch ( error ) {
                apis.defer.reject( new SimpError( "apis.getFlickrPhotos()" , "Parse flickr.com error, url is " + url, apis.vo ), error );
            }
        }, false );
        return def.promise();
    }

    function getFlickrPhotoURL( photo_id ) {

        console.log( "=== Flickr.com::getFlickrPhotoURL() call ===");

        var def = $.Deferred(),
            url = getFlickAPI( FLICKR_PHOTO_API, "photo_id", photo_id );

        apis.Update({ url : url, method : "apis.flickr()::getFlickrPhotoURL()", timeout: 2000 * 5 });
        apis.Remote( function( result ) {
          try {
              var hdurl = "",
                  info  = "",
                  item  = {};
              for( var idx = 0, len = result.sizes.size.length; idx < len; idx++ ) {
                item = result.sizes.size[idx];
                if ( item.width == "1600" ) {
                  hdurl = item.source;
                  info   = item.url;
                  apis.defer.resolve( hdurl, hdurl, "Flickr.com Image", info, date.Now(), "Flickr.com Image", apis.vo.origin, apis.vo );
                  break;
                }
              }
              if ( hdurl == "" && info == "" ) {
                new SimpError( apis.vo.method , "Parse flickr.com error, url is " + url, apis.vo );
                apis.Stack[ apis.ORIGINS[3] ]();
              }
          }
          catch ( error ) {
            apis.defer.reject( new SimpError( apis.vo.method , "Parse flickr.com error, url is " + url, apis.vo ), error );
          }
        }, false );
        return def.promise();
    }

    /*
    * Google Art Project
    */
    apis.Stack[ apis.ORIGINS[4] ] = function() {

        console.log( "=== googleart.com call ===");

        var dtd               = $.Deferred(),
            GOOGLE_ART_NAME   = "google.art.v2.project.json",
            GOOGLE_ART_SUFFIX = "=s1920-rw",
            GOOGLE_ART_PREFIX = "https://www.google.com/culturalinstitute/",
            url               = SIMP_API_HOST + GOOGLE_ART_NAME;

        apis.Update({ url : url, method : "apis.googleart()", timeout : 2000 * 2 });
        apis.Remote( function( result ) {
            try {
                var max    = result.length - 1,
                    random = apis.Random( 0, max ),
                    obj    = result[ random ],
                    hdurl  = obj.image + GOOGLE_ART_SUFFIX;
                dtd.resolve( hdurl, hdurl, obj.title, GOOGLE_ART_PREFIX + obj.link, date.Now(), "GooglArtProject Image-" + obj.title, apis.vo.origin, apis.vo );
            }
            catch( error ) {
                dtd.reject( new SimpError( apis.vo.method , "Parse googleart.com error, url is " + url, apis.vo ), error );
            }
        });
        return dtd;
    }

    /*
    * 500 px
    */
    var PX_KEY  = "VM5xNIpewHeIv4BFDthn3hfympuzfPEZPADv6WK7",
        PX_API  = "500px.api.json",
        PX_URL  = "https://api.500px.com/v1",
        PX_HOME = "https://www.500px.com";

    apis.Stack[ apis.ORIGINS[5] ] = function() {
        console.log( "=== 500px.com call ===");
        get500pxURL().then( get500API );
        return apis.defer.promise();
    }

    function get500pxURL() {
        var def = $.Deferred();

        apis.Update({ url : SIMP_API_HOST + PX_API, method : "apis.get500pxURL()", timeout : 2000 * 5 });
        apis.Remote( function( result ) {
            try {
                var max    = result.apis.length - 1,
                    random = apis.Random( 0, max ),
                    obj    = result.apis[ random ],
                    param  = ["?consumer_key=" + PX_KEY];

                obj.args.map( function( item ) {
                    param.push( item.key + "=" + item.val );
                });
                def.resolve( PX_URL + obj.method + param.join("&") );
            }
            catch ( error ) {
              apis.defer.reject( new SimpError( apis.vo.method , "Parse 500px.com error, url is " + SIMP_API_HOST + PX_API, apis.vo ), error );
            }
        });
        return def.promise();
    }

    function get500API( url ) {
        var def = $.Deferred();

        apis.Update({ url : url, method : "apis.get500API()", timeout : 2000 * 5 });
        apis.Remote( function( result ) {
            try {
                var max    = result.photos.length - 1,
                    random = apis.Random( 0, max ),
                    obj    = result.photos[ random ];

                while ( obj.height < 1000 ) {
                    random = apis.Random( 0, max );
                    obj    = result.photos[ random ];
                }
                apis.defer.resolve( obj.image_url, obj.image_url, obj.name, PX_HOME + obj.url, date.Now(), "500px.com Image-" + obj.name, apis.vo.origin, apis.vo );
            }
            catch ( error ) {
              apis.defer.reject( new SimpError( apis.vo.method , "Parse 500px.com error, url is " + url, apis.vo ), error );
            }
        });
    }

    /*
    * Desktoppr.co background
    */
    apis.Stack[ apis.ORIGINS[6] ] = function() {

        console.log( "=== Desktoppr.co call ===");

        var dtd    = $.Deferred(),
            max    = 4586,
            url    = "https://api.desktoppr.co/1/wallpapers?page=" + apis.Random( 0, max );

        apis.Update({ url : url, method : "apis.desktoppr()", timeout: 2000 * 4 });
        apis.Remote( function( result ) {
            try {
              var response = result.response,
                  max      = response.length,
                  random   = apis.Random( 0, max ),
                  obj      = response[ random ];

                  while ( obj.height < 1000 ) {
                      random = apis.Random( 0, max );
                      obj    = response[ random ];
                  }
                  dtd.resolve( obj.image.url, obj.image.url, "Desktoppr.co Image", obj.url, date.Now(), "Desktoppr.co Image", apis.vo.origin, apis.vo );
            }
            catch ( error ) {
                dtd.reject( new SimpError( apis.vo.method , "Parse Desktoppr.co error, url is " + url, apis.vo ), error );
            }
        });
        return dtd;
    }

    /*
    * Visual Hunt
    */
    apis.Stack[ apis.ORIGINS[7] ] = function() {

        console.log( "=== visualhunt.com call ===");

        var dtd             = $.Deferred(),
            VISUALHUNT_NAME = "visualhunt.json",
            VISUALHUNT_HOST = "https://visualhunt.com";

        apis.Update({ url : SIMP_API_HOST + VISUALHUNT_NAME, method : "apis.visualhunt()" });
        apis.Remote( function( result ) {
            try {
              var max    = result.length,
                  random = apis.Random( 0, max ),
                  obj    = result[ random ],
                  url    = obj.url.replace( "http://", "https://" ); // 139-simptab-visualhunt-com-cross-origin-resource-sharing-policy-no-access-control-allow-origin
                  dtd.resolve( url, url, "Visualhunt.com Image", VISUALHUNT_HOST + obj.info, date.Now(), "Visualhunt.com Image", apis.vo.origin, apis.vo );
            }
            catch( error ) {
                dtd.reject( new SimpError( apis.vo.method , "Parse visualhunt.com error, url is " + apis.vo.url, apis.vo ), error );
            }
        });
        return dtd;
    }

    /*
    function nasa() {

      console.log( "=== nasa.gov call ===");

      var rss = "http://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss";
      $.ajax({
            type       : "GET",
            timeout    : 2000*10,
            url        : rss,
            dataType   : "xml" })
        .then( function ( result ) {
          if ( result && !$.isEmptyObject( result )) {
            try {
              var items  = $( result ).find( "item" ),
                  max    = items.length,
                  random = createRandom( 0, max ),
                  $item  = $( items[random] ),
                  url    = $item.find( "enclosure" ).attr( "url" ),
                  name   = $item.find( "title" ).text(),
                  info   = $item.find( "link" ).text();
              deferred.resolve( vo.Create( url, url, "NASA.gov Image - " + name, info, date.Now(), "NASA.gov Image", "nasa.gov" ) );
            }
            catch ( error ) {
              deferred.reject( SimpError.Clone( new SimpError( "apis.nasa()", null , "Parse lg_image_of_the_day.rss error." ), error ));
            }
          }
          else {
            deferred.reject( new SimpError( "apis.nasa()", "nasa rss parse error.", result ));
          }
        }, failed );
    }
    */

    apis.Stack[ apis.ORIGINS[8] ] = function() {

      console.log( "=== nasa.gov call ===");

      var API_KEY = "ZwPdNTaFcYqj7XIRnyKt18fUZ1vJJXsSjJtairMq",
          API     = "https://api.nasa.gov/planetary/apod?hd=True&api_key=" + API_KEY,
          url     = ( function( url ) {
            var years = [2012, 2013, 2014, 2015],
                year  = years[ apis.Random( 0, years.length - 1 )],
                month = apis.Random( 1, 12 ),
                day   = apis.Random( 1, 31 );
                month = month < 9 ? "0" + "" + month : month;
                day   = day   < 9 ? "0" + "" + day   : day;
            return  url + "&date=" + year + "-" + month + "-" + day;
      })( API );

      apis.Update({ url : url, method : "apis.apod()", timeout : 2000 * 5 });
      apis.Remote( function( result ) {
          try {
            var name = result.title,
                url  = result.hdurl;
            apis.defer.resolve( url, url, "NASA.gov APOD Image - " + name, "#", date.Now(), "NASA.gov APOD Image", apis.vo.origin, apis.vo );
          }
          catch ( error ) {
            apis.defer.reject( new SimpError( apis.vo.method , "Parse nasa apod api error, url is " + url, apis.vo ), error );
          }
      }, false );
      return apis.defer.promise();
    }

    /*
    * Favorite background
    */
    apis.Stack[ apis.ORIGINS[10] ] = function() {

        console.log( "=== Favorite background call ===");

        try {
            var dtd = $.Deferred(),
                arr = JSON.parse( localStorage[ "simptab-favorites" ] || "[]" );
            if ( !Array.isArray( arr ) || arr.length == 0 ) {
                //dtd.reject( new SimpError( "favorite", "Local storge 'simptab-favorites' not exist.", apis.vo ));
                new Notify().Render( i18n.GetLang( "notify_favorite_empty" ) );
                dtd.resolve( vo.Create( vo.constructor.DEFAULT_BACKGROUND, vo.constructor.DEFAULT_BACKGROUND, "Wallpaper", "#", date.Now(), "Wallpaper", "default", {} ));
                return dtd;
            }

            var max    = arr.length - 1,
                random = apis.Random( 0, max ),
                obj    = JSON.parse( arr[ random ] ),
                result = JSON.parse( obj.result );
            console.log( "Get favorite background is ", JSON.parse( obj.result ) );
            // verify favorite data structure
            if ( !vo.Verify.call( result ))  {
                dtd.reject( new SimpError( "favorite", "Current 'simptab-favorites' vo structure error.", { result : result, apis_vo : apis.vo }));
            }
            else {
                setTimeout( function(){ dtd.resolve( result.url, result.url, result.name, result.info, result.enddate, result.shortname, result.type, result.apis_vo, result.favorite ); }, 1000 );
            }
        }
        catch( error ) {
            dtd.reject( new SimpError( "favorite", "Current 'simptab-favorites' data structure error.", apis.vo ), error );
        }
        return dtd;
    }

    /*
    * Holiday background
    */
    function isHoliday() {
        var HOLIDAY_LIST_1 = [20151207, 20151222, 20160106, 20160120, 20160201, 20160204, 20160207, 20160208, 20160219, 20160222, 20160305, 20160320, 20160404, 20160419, 20160505, 20160520, 20160605, 20160621, 20160707, 20160722, 20160807, 20160823, 20160907, 20160922, 20161008, 20161023, 20161107, 20161122, 20161207, 20161221, 20170105, 20170120];
        var HOLIDAY_LIST_2 = [20151224, 20151225];
        var arr         = HOLIDAY_LIST_1.concat( HOLIDAY_LIST_2 ),
            new_holiday = date.Today(),
            old_holiday = localStorage["simptab-holiday"];

        if ( arr.filter(function(item){return item == new_holiday;}).length > 0 && old_holiday != new_holiday ) {
            localStorage["simptab-holiday"] = new_holiday;
            return true;
        }
        else {
            return false;
        }
    }

    /*
    * Holiday background
    */
    apis.Stack[ apis.ORIGINS[11] ] = function() {
        apis.Stack[ apis.ORIGINS[9] ]( "holiday" ); // call special( "holiday" );
        return apis.defer.promise();
    }

    /*
    * Special day/Holiday background
    */
     apis.Stack[ apis.ORIGINS[9] ] = function() {

        console.log( "=== Special day/Holiday background call ===");

          var SPECIAL_URL = "special.day.v2.json",
              dtd         = $.Deferred(),
              type        = arguments.length > 0 ? arguments[0] : "special";

          apis.Update({ url : SIMP_API_HOST + SPECIAL_URL, method : "apis.special()" });
          apis.Remote( function( result ) {
            try {
                var obj = result[type],
                    key, max, random, special_day, data, hdurl;

                if ( type == "special" ) {
                    var arr = result.collections;
                    if ( options.Storage.db.subscribe.sequence ) {
                        options.Storage.db.subscribe.index++;
                        options.Storage.db.subscribe.index == arr.length && ( options.Storage.db.subscribe.index = 0 );
                        options.Storage.Set();
                        random = options.Storage.db.subscribe.index;
                    } else {
                        max     = arr.length - 1;
                        random  = apis.Random( 0, max );
                    }
                    data    = arr[ random ];
                    hdurl   = data.url;
                    type    = i18n.GetLang( "controlbar_special" );
                    data.name == "" && ( data.name = data.origin );
                } else {
                    key         = date.Today();
                    data        = obj[key];
                    if ( !data ) {
                        dtd.reject( new SimpError( apis.vo.origin, "Current holiday is " + key + ", but not any data from " + SIMP_API_HOST + SPECIAL_URL, result ));
                        return dtd.promise();
                    }
                    max         = data.hdurl.length - 1;
                    random      = apis.Random( 0, max );
                    hdurl       = SIMP_API_HOST + type + "/" + data.hdurl[random] + ".jpg";
                }
                apis.Update({ origin : type });
                dtd.resolve( hdurl, hdurl, data.name, data.info, date.Now(), data.name, type, apis.vo );
            }
            catch( error ) {
                dtd.reject( new SimpError( apis.vo.origin, "Get special backgrond error.", apis.vo ), error );
            }
          });
          //return apis.defer.promise();
          return dtd;
    }

    function init() {
        var dtd = $.Deferred();
        apis.Stack[ apis.New().origin ]()
        .done( function() {
            var url = arguments && arguments[0];
            // when change background mode is 'day', not invoke vo.isDislike( url )
            if ( !setting.IsRandom() || vo.isDislike( url )) {
                vo.Create.apply( vo, arguments );
                vo.new.hdurl = cdns.New( vo.new.hdurl, vo.new.type );
                vo.new.favorite != -1 && ( vo.new.hdurl = "filesystem:" + chrome.extension.getURL( "/" ) + "temporary/favorites/" + vo.new.favorite + ".jpg" );
                dtd.resolve( vo.new );
            }
            else {
                new SimpError( apis.vo.origin, "Current background url is dislike url =" + url, apis.vo );
                init();
            }
        })
        .fail( function( result, error ) {
            SimpError.Clone( result, (!error ? result : error));
            apis.failed++;
            if ( apis.vo.origin == "today" ) apis.failed = apis.ORIGINS_MAX;
            apis.failed < apis.ORIGINS_MAX - 5 ? init() : dtd.reject( result, error );
        });
        return dtd;
    }

    return {
        Init: init,

        Earth: function ( callback ) {
            var size = 550,
                urls = [
                    "https://simptab.now.sh/earth/0_0.png",
                    "https://simptab.now.sh/earth/0_1.png",
                    "https://simptab.now.sh/earth/1_0.png",
                    "https://simptab.now.sh/earth/1_1.png",
                ],
                poisition = [{ x:0, y: 0 },{ x:0, y: size },{ x:size, y: 0 },{ x:size, y: size }],
                imgLoad   = function( i, poisition, url, context ) {
                    var dtd = $.Deferred(),
                        img = new Image();
                    img.src = url;
                    img.onload = function() {
                        context.drawImage( img, poisition.x, poisition.y, size, size );
                        dtd.resolve( i );
                    };
                    return dtd;
                },
                imgOnLoad = function ( result ) {
                    if ( result < urls.length - 1 ) {
                        i++;
                        imgLoad( i, poisition[i], urls[i], context ).done( imgOnLoad );
                    } else complete();
                },
                complete = function() {
                    vo.new.type     = "earth";
                    vo.new.hdurl    = "http://himawari8.nict.go.jp/";
                    vo.new.url      = "http://himawari8.nict.go.jp/";
                    vo.new.info     = "http://himawari8.nict.go.jp/";
                    vo.new.name     = "himawari8.nict.go.jp";
                    vo.new.favorite = -1;
                    vo.new.pin      = -1;
                    vo.new.dislike  = -1;
                    vo.new.enddate  = date.Now();
                    vo.new.version  = vo.cur.version;
                    callback( canvas.toDataURL( "image/png" ));
                },
                canvas, context, i = 0;

            canvas        = document.createElement( "canvas" );
            canvas.width  = size * 2;
            canvas.height = size * 2;
            context       = canvas.getContext( "2d" );
            context.rect( 0 , 0 , canvas.width , canvas.height );

            imgLoad( i, poisition[i], urls[i], context ).done( imgOnLoad );
        }
    };
});
