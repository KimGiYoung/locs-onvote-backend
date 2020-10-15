let Results = {}
Results.onSuccess = (data) => {
    return {
        success: true,
        message: null,
        data: data || null
    }
}
Results.onFailure = (message) => {
    return {
        success: false,
        message: message || null,
        data: null
    }
}

module.exports = Results;

