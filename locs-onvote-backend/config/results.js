let Results = {}
Results.onSuccess = (data) => {
    return {
        success: true,
        message: null,
        code: null,
        data: data || null
    }
}
Results.onFailure = (message, code = 1000) => {
    return {
        success: false,
        message: message || null,
        code,
        data: null
    }
}

module.exports = Results;

