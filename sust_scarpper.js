var results = {}
var stop = false;
var state = {
    current_roll: 1700000,
    processed_rolls: [],
    errors: [],
    response: "",
    nextFetchAt: "",
    setTimeoutId: 0
}; 

var checkProgress = function(){
fetch("https://shielded-hamlet-19093.herokuapp.com/processed_rolls", { method: "GET", })
.then(function(response){
    return response.json();
})
.then(function(data){
    let x = {};
    let sorted = data.rolls.sort(comp);
    for(let i=0; i<sorted.length; i++){
        if(sorted[i] + 1 == sorted[i+1]){
            continue;
        }else if(sorted[i] + 1 != sorted[i+1]){
            x[sorted[i]] = sorted[i+1] - sorted[i];
        }
    }
    console.log(x);
    return {
        'progress': x,
	'data': data.rolls
    };
})
}

//populating the processed rolls attr with the rolls that are already in the DB
var populateProcessed_rolls = function(callback, arg1, arg2){
    fetch("https://shielded-hamlet-19093.herokuapp.com/processed_rolls", { method: "GET", })
    .then(function(response){ 
        return response.json(); 
    })
    .then(function(data){ 
        state.processed_rolls = data.rolls;
        callback(arg1, arg2)
    })
}

setTimeout(populateProcessed_rolls, 10000)

var scheduleFetch = function(randMiliSeconds, nextRoll){
    let nextFetchTime = new Date;
    nextFetchTime.setSeconds(nextFetchTime.getSeconds() + randMiliSeconds/1000)
    state.nextFetchAt = nextFetchTime
    setTimeout(fetchReesult, randMiliSeconds, nextRoll);
}

var saveResult = function(student, callback){
    fetch("https://shielded-hamlet-19093.herokuapp.com/sust_result_scrapper", {
        method: "POST",
        headers: {
            'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: $.param(student)
    })
    .then(function(response){ 
        return response.json(); 
    })
    .then(function(data){ 
        state.response = data
        callback()
    }).catch(function(err){
        let newState = JSON.parse(JSON.stringify(state));
        delete newState.errors;
        state.errors.push({
            'error_at_db_api': err,
            'timestamp': (new Date).toString(),
            'state': newState
        });
        setTimeout(saveResult(student, callback), 1000); 
    })
}

var fetchReesult = function(roll){ 
    if(!state.processed_rolls.includes(roll) && stop == false){
        state.current_roll = roll;    //its a global for keeping tack of whats happening
        $.ajaxSetup({
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRF-TOKEN', $('meta[name="secret"]').attr('content'));
            }
        });
        $.ajax({
            type: "POST",
            url: "https://admission.sust.edu/result-check",
            data: {
                'exam_roll': roll,
            },
            success: function(data) {
                if (data.error) {
                    if(data.error.search("You are not in the list")){
                        let student = {
                            'name': "",
                            'roll': roll,
                            'rank': -1,
                            'unit': "",
                            'group': "",
                            'quota': "",
                        }
                        saveResult(student, function(){
                            populateProcessed_rolls(scheduleFetch, Math.random()*5000, ++roll);
                        })
                        
                    }else{
                        let newState = JSON.parse(JSON.stringify(state));
                        delete newState.errors;
                        state.errors.push({
                            'error_at_success': err,
                            'timestamp': (new Date).toString(),
                            'state': newState
                        });
                    }  
                } else {
                    /*
                        sample
                        <span class='text-gray pb-4'><strong>AL-MUBIN KHAN NABIL </strong>:::</span><br>&nbsp;&nbsp;
                        &nbsp;Exam Roll: <strong>1707574</strong>, Unit: B1, Group: 1, Quota: NONE, Rank: <strong>445</strong>
                    */               
                    let result = data.success;
                    let strongIndex1 = [...result.matchAll('<strong>')];
                    let strongIndex2 = [...result.matchAll('</strong>')];
                    let commaIndex = [...result.matchAll(',')];
                    let student = {
                        'name': result.slice(strongIndex1[0].index+"<strong>".length, strongIndex2[0].index),
                        'roll': result.slice(strongIndex1[1].index+"<strong>".length, strongIndex2[1].index),
                        'rank': result.slice(strongIndex1[2].index+"<strong>".length, strongIndex2[2].index),
                        'unit': result.slice(result.matchAll('Unit: ').next().value.index+"Unit: ".length, commaIndex[1].index),
                        'group': result.slice(result.matchAll('Group: ').next().value.index+"Group: ".length, commaIndex[2].index),
                        'quota': result.slice(result.matchAll('Quota: ').next().value.index+"Quota: ".length, commaIndex[3].index),
                    }
                    saveResult(student, function(){
                        //results[state.current_roll] = student;
                        populateProcessed_rolls(scheduleFetch, Math.random()*5000, ++roll);
                    }) 
                }
            },
            error: function(err, errExtra) {
                let newState = JSON.parse(JSON.stringify(state));
                delete newState.errors;
                state.errors.push({
                    'error_at_sust_api': errExtra,
                    'timestamp': (new Date).toString(),
                    'state': newState
                });
                scheduleFetch(Math.random()*5000, roll)
            },
            complete: function() {
                //btn.html('<i class="fa fa-search fa-spinn text-info px-2"></i>');
            }
        })
    }else{
        fetchReesult(++roll);
    }
}
fetchReesult(1720000)