package com.pricestalker.api.dto.push;

import lombok.Data;

/** Body for DELETE /push/subscriptions: { endpoint }. */
@Data
public class EndpointDto {
    private String endpoint;
}
